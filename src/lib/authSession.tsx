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

    supabase.auth.getSession().then(({ data }) => {
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
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
  }, []);

  return session;
}
