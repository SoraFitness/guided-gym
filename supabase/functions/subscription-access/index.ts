import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { UnauthorizedError, requireUser } from "../_shared/auth.ts";
import {
  SubscriptionVerificationError,
  getSubscriptionAccess,
} from "../_shared/subscription.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { user } = await requireUser(request);
    return jsonResponse(await getSubscriptionAccess(user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) return jsonResponse({ error: error.message }, 401);
    if (error instanceof SubscriptionVerificationError) {
      return jsonResponse({ error: error.message }, 503);
    }
    console.error("[subscription-access] failed", error);
    return jsonResponse({ error: "Subscription verification failed" }, 500);
  }
});
