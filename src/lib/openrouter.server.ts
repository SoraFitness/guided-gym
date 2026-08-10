import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Model used by the AI coach. Browse alternatives at https://openrouter.ai/models
// Flash is intentionally used for the interactive coach: low TTFT matters more
// here than the deeper reasoning used by offline plan/report generation.
export const OPENROUTER_COACH_MODEL = "qwen/qwen3.5-flash-02-23";

export function createOpenRouterProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Optional attribution header — lets the app appear on OpenRouter leaderboards.
      "X-Title": "Ascendr Fitness Coach",
    },
  });
}
