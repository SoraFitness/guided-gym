export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-ascendr-operation",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function corsPreflightResponse() {
  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}
