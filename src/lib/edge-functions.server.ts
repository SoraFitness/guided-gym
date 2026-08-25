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
  return {
    apikey: key,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(operation ? { "X-Ascendr-Operation": operation } : {}),
  };
}

export function createAscendrAiProvider(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
) {
  return createOpenAICompatible({
    name: "ascendr-ai-gateway",
    baseURL: edgeFunctionUrl("ai-gateway"),
    headers: edgeHeaders(accessToken, operation),
  });
}

export async function fetchAscendrAi(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
  payload: unknown,
) {
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
