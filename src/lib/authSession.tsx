import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthSession {
  userId: string;
  accessToken: string;
  email: string | null;
}

export type AuthSessionState = AuthSession | null | "loading";

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
          setSession(
            data.session
              ? {
                  userId: data.session.user.id,
                  accessToken: data.session.access_token,
                  email: data.session.user.email ?? null,
                }
              : null,
          );
        })
        .catch((error: unknown) => {
          console.warn("[auth] Session is unavailable; continuing locally", error);
          if (mounted) setSession(null);
        });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        setSession(
          nextSession
            ? {
                userId: nextSession.user.id,
                accessToken: nextSession.access_token,
                email: nextSession.user.email ?? null,
              }
            : null,
        );
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
