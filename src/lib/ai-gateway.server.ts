import { createAscendrAiProvider, type AiGatewayOperation } from "@/lib/edge-functions.server";

export function createAscendrAiGatewayProvider(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
) {
  return createAscendrAiProvider(accessToken, operation);
}
