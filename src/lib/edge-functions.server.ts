import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type AiGatewayOperation =
  | "body-scan-preview"
  | "body-scan"
  | "face-scan"
  | "food-scan"
  | "progress-photo-compare"
  | "weekly-report"
  | "workout-plan"
  | "coach";

// Keep in sync with supabase/functions/ai-gateway, which serves production.
const SCAN_MODEL = "qwen/qwen3-vl-235b-a22b-instruct";
const SCAN_PROVIDER = { order: ["parasail/fp8"], allow_fallbacks: true };

const LOCAL_PREVIEW_AI_OPERATIONS: Record<
  "body-scan-preview" | "body-scan" | "face-scan" | "coach",
  {
    model: string;
    maxTokens: number;
    title: string;
    provider?: { order: string[]; allow_fallbacks: boolean };
  }
> = {
  "body-scan-preview": {
    model: SCAN_MODEL,
    maxTokens: 500,
    title: "Ascendr Body Scan Preview",
    provider: SCAN_PROVIDER,
  },
  "body-scan": {
    model: SCAN_MODEL,
    maxTokens: 2600,
    title: "Ascendr Body Scan",
    provider: SCAN_PROVIDER,
  },
  "face-scan": {
    model: SCAN_MODEL,
    maxTokens: 1800,
    title: "Ascendr Face Scan",
    provider: SCAN_PROVIDER,
  },
  coach: {
    model: "qwen/qwen3.5-flash-02-23",
    maxTokens: 600,
    title: "Ascendr Fitness Coach",
  },
};
type LocalPreviewAiOperation = keyof typeof LOCAL_PREVIEW_AI_OPERATIONS;

function edgeConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public configuration is missing.");
  return { url: url.replace(/\/$/, ""), key };
}

export function edgeFunctionUrl(name: string) {
  return `${edgeConfig().url}/functions/v1/${name}`;
}

function edgeHeaders(accessToken?: string, operation?: AiGatewayOperation) {
  const { key } = edgeConfig();
  // Proves the request comes from Ascendr's server; the AI gateway only serves its free
  // operations (onboarding preview, workout plan) to requests carrying this key.
  const internalKey = process.env.AI_GATEWAY_INTERNAL_SECRET?.trim();
  return {
    apikey: key,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(operation ? { "X-Ascendr-Operation": operation } : {}),
    ...(operation && internalKey ? { "X-Ascendr-Internal-Key": internalKey } : {}),
  };
}

function localPreviewAiConfig(operation: AiGatewayOperation) {
  if (!import.meta.env.DEV || !isLocalPreviewAiOperation(operation)) return null;

  const apiKey =
    operation === "face-scan"
      ? process.env.OPENROUTER_FACE_SCAN_API_KEY || process.env.OPENROUTER_API_KEY
      : operation === "coach"
        ? process.env.OPENROUTER_API_KEY
        : process.env.OPENROUTER_BODY_SCAN_API_KEY || process.env.OPENROUTER_API_KEY;
  return apiKey ? { apiKey, ...LOCAL_PREVIEW_AI_OPERATIONS[operation] } : null;
}

function isLocalPreviewAiOperation(
  operation: AiGatewayOperation,
): operation is LocalPreviewAiOperation {
  return operation in LOCAL_PREVIEW_AI_OPERATIONS;
}

export function createAscendrAiProvider(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
) {
  const previewConfig = localPreviewAiConfig(operation);
  if (previewConfig) {
    return createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        Authorization: `Bearer ${previewConfig.apiKey}`,
        "X-Title": previewConfig.title,
      },
      supportsStructuredOutputs: true,
    });
  }

  // Structured outputs send the JSON schema to the model. Without it the model
  // guesses field names (e.g. "total_fat") and Output.object results fail to parse.
  return createOpenAICompatible({
    name: "ascendr-ai-gateway",
    baseURL: edgeFunctionUrl("ai-gateway"),
    headers: edgeHeaders(accessToken, operation),
    supportsStructuredOutputs: true,
  });
}

export async function fetchAscendrAi(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
  payload: unknown,
) {
  const previewConfig = localPreviewAiConfig(operation);
  if (previewConfig) {
    const requestPayload =
      payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${previewConfig.apiKey}`,
        "X-Title": previewConfig.title,
      },
      body: JSON.stringify({
        ...requestPayload,
        model: previewConfig.model,
        max_tokens: previewConfig.maxTokens,
        ...(previewConfig.provider ? { provider: previewConfig.provider } : {}),
      }),
    });
  }

  return fetch(`${edgeFunctionUrl("ai-gateway")}/chat/completions`, {
    method: "POST",
    headers: { ...edgeHeaders(accessToken, operation), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function invokeEdgeFunction<T>(
  name: string,
  accessToken: string | undefined,
  body: unknown = {},
): Promise<T> {
  const response = await fetch(edgeFunctionUrl(name), {
    method: "POST",
    headers: { ...edgeHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Edge Function ${name} failed.`);
  return payload;
}
