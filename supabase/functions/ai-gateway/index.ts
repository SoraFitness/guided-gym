import { corsHeaders, corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { UnauthorizedError, requireUser } from "../_shared/auth.ts";
import { optionalEnv } from "../_shared/env.ts";
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

const operations: Record<Operation, { model: string; maxTokens: number; paid: boolean; title: string }> = {
  "body-scan-preview": {
    model: "qwen/qwen3-vl-32b-instruct",
    maxTokens: 500,
    paid: false,
    title: "Ascendr Body Scan Preview",
  },
  "body-scan": {
    model: "qwen/qwen3-vl-32b-instruct",
    maxTokens: 2600,
    paid: true,
    title: "Ascendr Body Scan",
  },
  "face-scan": {
    model: "qwen/qwen3-vl-32b-instruct",
    maxTokens: 1200,
    paid: true,
    title: "Ascendr Face Scan",
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

function operationFor(request: Request): Operation | null {
  const value = request.headers.get("x-ascendr-operation");
  return value && value in operations ? (value as Operation) : null;
}

function responseHeaders(upstream: Response) {
  return {
    ...corsHeaders,
    "Cache-Control": "no-store",
    "Content-Type": upstream.headers.get("content-type") || "application/json",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const operation = operationFor(request);
  if (!operation) return jsonResponse({ error: "Unsupported AI operation" }, 400);
  const definition = operations[operation];

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON request" }, 400);
  }

  try {
    if (definition.paid) {
      const { user } = await requireUser(request);
      await requireActiveSubscription(user.id);
    }

    const openRouterKey = openRouterKeyFor(operation);
    if (!openRouterKey) return jsonResponse({ error: "AI is not configured" }, 503);

    const requestedTokens = Number(payload.max_tokens ?? payload.maxTokens ?? definition.maxTokens);
    const maxTokens = Number.isFinite(requestedTokens)
      ? Math.max(1, Math.min(Math.floor(requestedTokens), definition.maxTokens))
      : definition.maxTokens;
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
        "X-Title": definition.title,
      },
      body: JSON.stringify({ ...payload, model: definition.model, max_tokens: maxTokens }),
    });
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders(upstream) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: error.message }, 401);
    if (error instanceof SubscriptionRequiredError) return jsonResponse({ error: error.message }, 402);
    if (error instanceof SubscriptionVerificationError) return jsonResponse({ error: error.message }, 503);
    console.error("[ai-gateway] failed", error);
    return jsonResponse({ error: "AI request failed" }, 502);
  }
});
