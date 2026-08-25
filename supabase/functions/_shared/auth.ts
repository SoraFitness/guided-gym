import { createClient } from "npm:@supabase/supabase-js@2";
import { requiredEnv } from "./env.ts";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

function supabasePublicKey() {
  return Deno.env.get("SUPABASE_ANON_KEY")?.trim() || requiredEnv("SUPABASE_PUBLISHABLE_KEY");
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new UnauthorizedError();
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new UnauthorizedError();
  return token;
}

export async function requireUser(request: Request) {
  const token = getBearerToken(request);
  const supabase = createClient(requiredEnv("SUPABASE_URL"), supabasePublicKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new UnauthorizedError();
  return { supabase, token, user: data.user };
}

export function createAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
