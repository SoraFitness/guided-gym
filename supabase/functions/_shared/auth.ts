import { createClient } from "npm:@supabase/supabase-js@2";
import { requiredEnv } from "./env.ts";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
  }
}

/** The account signed in on a newer device, so this older session no longer has access. */
export class SessionReplacedError extends UnauthorizedError {
  constructor() {
    super("SESSION_REPLACED");
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

  // One active device per account: only the newest sign-in may use the API.
  const { data: isCurrentSession, error: sessionError } = await supabase.rpc("is_current_session");
  if (sessionError) {
    console.error("[auth] session check failed", sessionError.message);
    throw new UnauthorizedError();
  }
  if (isCurrentSession !== true) throw new SessionReplacedError();

  return { supabase, token, user: data.user };
}

export function createAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
