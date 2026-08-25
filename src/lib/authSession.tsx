import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthSession {
  userId: string;
  accessToken: string;
  email: string | null;
  isAnonymous: boolean;
}

export type AuthSessionState = AuthSession | null | "loading";

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  return {
    userId: session.user.id,
    accessToken: session.access_token,
    email: session.user.email ?? null,
    isAnonymous: session.user.is_anonymous === true,
  };
}

export function isGuestSession(session: AuthSessionState) {
  return session === null || (session !== "loading" && session.isAnonymous);
}

export function isAccountSession(session: AuthSessionState): session is AuthSession {
  return session !== null && session !== "loading" && !session.isAnonymous;
}

export async function startAnonymousSession() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  const session = toAuthSession(data.session);
  if (!session) throw new Error("Couldn't start a secure guest session.");
  return session;
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<AuthSessionState>("loading");

  useEffect(() => {
    let mounted = true;

    try {
      // The core training experience must still open in builds without
      // optional Supabase client credentials (for example a TestFlight build
      // using the hosted web app). The proxy throws synchronously when those
      // values are absent, so keep auth as an unavailable, signed-out state
      // instead of letting the route error boundary replace the paywall.
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!mounted) return;
          setSession(toAuthSession(data.session));
        })
        .catch((error: unknown) => {
          console.warn("[auth] Session is unavailable; continuing locally", error);
          if (mounted) setSession(null);
        });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        setSession(toAuthSession(nextSession));
      });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    } catch (error) {
      console.warn("[auth] Supabase is unavailable; continuing locally", error);
      setSession(null);
    }

    return () => {
      mounted = false;
    };
  }, []);

  return session;
}
