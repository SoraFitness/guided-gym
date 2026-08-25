import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { UnauthorizedError, requireUser } from "../_shared/auth.ts";
import { optionalEnv } from "../_shared/env.ts";
import {
  SubscriptionRequiredError,
  SubscriptionVerificationError,
  requireActiveSubscription,
} from "../_shared/subscription.ts";

type Action = "nutritionix-search" | "usda-search";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { action, query } = (await request.json()) as { action?: Action; query?: unknown };
    if ((action !== "nutritionix-search" && action !== "usda-search") || typeof query !== "string") {
      return jsonResponse({ error: "Invalid food lookup request" }, 400);
    }
    const normalizedQuery = query.trim().slice(0, 120);
    if (!normalizedQuery) return jsonResponse({ data: null });

    const { user } = await requireUser(request);
    await requireActiveSubscription(user.id);

    if (action === "nutritionix-search") {
      const appId = optionalEnv("NUTRITIONIX_APP_ID");
      const apiKey = optionalEnv("NUTRITIONIX_API_KEY");
      if (!appId || !apiKey) return jsonResponse({ data: null });
      const response = await fetch(
        `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(normalizedQuery)}&detailed=true`,
        { headers: { "x-app-id": appId, "x-app-key": apiKey, "x-remote-user-id": "0" } },
      );
      if (!response.ok) return jsonResponse({ data: null });
      return jsonResponse({ data: await response.json() });
    }

    const apiKey = optionalEnv("USDA_API_KEY");
    if (!apiKey) return jsonResponse({ data: null });
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(normalizedQuery)}&pageSize=15&dataType=Branded,SR%20Legacy,Foundation`,
    );
    if (!response.ok) return jsonResponse({ data: null });
    return jsonResponse({ data: await response.json() });
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: error.message }, 401);
    if (error instanceof SubscriptionRequiredError) return jsonResponse({ error: error.message }, 402);
    if (error instanceof SubscriptionVerificationError) return jsonResponse({ error: error.message }, 503);
    console.error("[food-provider] failed", error);
    return jsonResponse({ error: "Food lookup failed" }, 502);
  }
});
