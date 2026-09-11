import { optionalEnv } from "./env.ts";

// Browsers may only call these functions from Ascendr's own app origins. Server-to-server
// calls send no Origin header and are unaffected. Add other origins with ALLOWED_ORIGINS
// (comma-separated), for example a custom domain.
const DEFAULT_ORIGINS = [
  "https://ascendr.org",
  "https://www.ascendr.org",
  "https://guided-gym.vercel.app",
  "capacitor://localhost",
];
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/guided-gym(-[a-z0-9-]+)?\.vercel\.app$/;
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-ascendr-operation",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  Vary: "Origin",
};

export function isAllowedOrigin(origin: string) {
  const extra = (optionalEnv("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return (
    DEFAULT_ORIGINS.includes(origin) ||
    extra.includes(origin) ||
    VERCEL_PREVIEW_ORIGIN.test(origin) ||
    LOCAL_ORIGIN.test(origin)
  );
}

/** Adds the Allow-Origin header to responses for approved app origins only. */
export function withCors(handler: (request: Request) => Response | Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request);
    const origin = request.headers.get("origin");
    if (origin && isAllowedOrigin(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    return response;
  };
}

export function corsPreflightResponse() {
  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}
