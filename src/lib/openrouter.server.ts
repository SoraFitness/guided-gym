import { createAscendrAiProvider, type AiGatewayOperation } from "@/lib/edge-functions.server";

export const OPENROUTER_COACH_MODEL = "qwen/qwen3.5-flash-02-23";

export function createOpenRouterProvider(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
) {
  return createAscendrAiProvider(accessToken, operation);
}
