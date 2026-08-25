import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve((request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("REVENUECAT_IOS_API_KEY")?.trim();
  if (!apiKey?.startsWith("appl_")) {
    return jsonResponse({ error: "RevenueCat iOS configuration is unavailable" }, 503);
  }

  return jsonResponse({ apiKey });
});
