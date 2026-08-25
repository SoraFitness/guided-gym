import { createAscendrAiProvider, type AiGatewayOperation } from "@/lib/edge-functions.server";

export function createLovableAiGatewayProvider(
  accessToken: string | undefined,
  operation: AiGatewayOperation,
) {
  return createAscendrAiProvider(accessToken, operation);
}
