import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Model used by the AI coach. Browse alternatives at https://openrouter.ai/models
export const OPENROUTER_COACH_MODEL = "qwen/qwen3.5-plus-20260420";

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
