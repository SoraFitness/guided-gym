import { corsHeaders, corsPreflightResponse, jsonResponse, withCors } from "../_shared/cors.ts";
import { UnauthorizedError, requireUser } from "../_shared/auth.ts";
import { optionalEnv } from "../_shared/env.ts";
import { secretsMatch } from "../_shared/secrets.ts";
import {
  SubscriptionRequiredError,
  SubscriptionVerificationError,
  openRouterKeyFor,
  requireActiveSubscription,
} from "../_shared/subscription.ts";

type Operation =
  | "body-scan-preview"
  | "body-scan"
  | "face-scan"
  | "food-scan"
  | "progress-photo-compare"
  | "weekly-report"
  | "workout-plan"
  | "coach";

// Qwen3 VL 32B was retired by OpenRouter on 2026-10-09. Scans moved to its larger
// sibling, which kept the scan prompts' JSON output valid in live tests. Parasail is
// preferred: in those tests it returned identical scores on repeat runs at
// temperature 0 and answered in 10–20s (DeepInfra took 40–90s). The other hosts
// remain as fallbacks so a provider outage never blocks a scan.
const SCAN_MODEL = "qwen/qwen3-vl-235b-a22b-instruct";
const SCAN_PROVIDER = { order: ["parasail/fp8"], allow_fallbacks: true };

type OperationDefinition = {
  model: string;
  maxTokens: number;
  paid: boolean;
  title: string;
  provider?: { order: string[]; allow_fallbacks: boolean };
};

const operations: Record<Operation, OperationDefinition> = {
  "body-scan-preview": {
    model: SCAN_MODEL,
    maxTokens: 500,
    paid: false,
    title: "Ascendr Body Scan Preview",
    provider: SCAN_PROVIDER,
  },
  "body-scan": {
    model: SCAN_MODEL,
    maxTokens: 2600,
    paid: true,
    title: "Ascendr Body Scan",
    provider: SCAN_PROVIDER,
  },
  "face-scan": {
    model: SCAN_MODEL,
    maxTokens: 1800,
    paid: true,
    title: "Ascendr Face Scan",
    provider: SCAN_PROVIDER,
  },
  "food-scan": {
    model: "google/gemini-2.5-flash",
    maxTokens: 1800,
    paid: true,
    title: "Ascendr Food Scan",
  },
  "progress-photo-compare": {
    model: "google/gemini-2.5-flash",
    maxTokens: 1200,
    paid: true,
    title: "Ascendr Progress Photo Compare",
  },
  "weekly-report": {
    model: "google/gemini-3-flash-preview",
    maxTokens: 900,
    paid: true,
    title: "Ascendr Weekly Report",
  },
  "workout-plan": {
    model: "qwen/qwen3.5-flash-02-23",
    maxTokens: 1200,
    paid: false,
    title: "Ascendr Workout Plan",
  },
  coach: {
    model: "qwen/qwen3.5-flash-02-23",
    maxTokens: 600,
    paid: true,
    title: "Ascendr Fitness Coach",
  },
};

const MAX_REQUEST_BYTES = 15 * 1024 * 1024;
// Fields that could route to other (pricier) models or add paid tools are never forwarded.
const STRIPPED_FIELDS = new Set([
  "model",
  "models",
  "plugins",
  "provider",
  "route",
  "web_search_options",
  "maxTokens",
]);

function operationFor(request: Request): Operation | null {
  const value = request.headers.get("x-ascendr-operation");
  return value && value in operations ? (value as Operation) : null;
}

/** Free operations (onboarding preview, workout plan) are only reachable from Ascendr's own server. */
function isInternalRequest(request: Request) {
  const expected = optionalEnv("AI_GATEWAY_INTERNAL_SECRET");
  const provided = request.headers.get("x-ascendr-internal-key");
  return Boolean(expected && provided && secretsMatch(provided, expected));
}

function responseHeaders(upstream: Response) {
  return {
    ...corsHeaders,
    "Cache-Control": "no-store",
    "Content-Type": upstream.headers.get("content-type") || "application/json",
  };
}

Deno.serve(withCors(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Request is too large" }, 413);
  }

  const operation = operationFor(request);
  if (!operation) return jsonResponse({ error: "Unsupported AI operation" }, 400);
  const definition = operations[operation];

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON request" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Invalid JSON request" }, 400);
  }

  try {
    if (definition.paid) {
      const { user } = await requireUser(request);
      await requireActiveSubscription(user.id);
    } else if (!isInternalRequest(request)) {
      throw new UnauthorizedError();
    }

    const openRouterKey = openRouterKeyFor(operation);
    if (!openRouterKey) return jsonResponse({ error: "AI is not configured" }, 503);

    const requestedTokens = Number(payload.max_tokens ?? payload.maxTokens ?? definition.maxTokens);
    const maxTokens = Number.isFinite(requestedTokens)
      ? Math.max(1, Math.min(Math.floor(requestedTokens), definition.maxTokens))
      : definition.maxTokens;
    const forwarded = Object.fromEntries(
      Object.entries(payload).filter(([key]) => !STRIPPED_FIELDS.has(key)),
    );
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
        "X-Title": definition.title,
      },
      body: JSON.stringify({
        ...forwarded,
        model: definition.model,
        max_tokens: maxTokens,
        ...(definition.provider ? { provider: definition.provider } : {}),
      }),
    });
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders(upstream) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: error.message }, 401);
    if (error instanceof SubscriptionRequiredError) return jsonResponse({ error: error.message }, 402);
    if (error instanceof SubscriptionVerificationError) return jsonResponse({ error: error.message }, 503);
    console.error("[ai-gateway] failed", error);
    return jsonResponse({ error: "AI request failed" }, 502);
  }
}));
