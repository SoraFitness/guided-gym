import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markSessionReplaced } from "@/lib/sessionReplaced";

const CHECK_INTERVAL_MS = 30_000;

function sessionIdFromToken(accessToken: string): string | null {
  try {
    const payload = accessToken.split(".")[1] ?? "";
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      session_id?: unknown;
    };
    return typeof claims.session_id === "string" ? claims.session_id : null;
  } catch {
    return null;
  }
}

/**
 * Keeps an Ascendr account active on one device at a time. The newest sign-in wins: that
 * device revokes older sign-ins, and an older device that finds it was replaced signs out
 * and explains why on the sign-in screen. The database, server functions, and Edge
 * Functions enforce the same rule on every request.
 */
export function SingleDeviceGuard() {
  useEffect(() => {
    let cancelled = false;
    let checking = false;
    const revokedOthersFor = new Set<string>();

    const check = async () => {
      if (cancelled || checking) return;
      checking = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        const { data: isCurrent, error } = await supabase.rpc("is_current_session");
        // Never sign a member out because a check failed; the backend still blocks replaced devices.
        if (error || cancelled) return;

        if (isCurrent === true) {
          const sessionId = sessionIdFromToken(session.access_token);
          if (sessionId && !revokedOthersFor.has(sessionId)) {
            revokedOthersFor.add(sessionId);
            const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
            if (revokeError) revokedOthersFor.delete(sessionId);
          }
          return;
        }

        markSessionReplaced();
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/account?mode=signin");
      } catch (error) {
        console.warn("[session] Device check failed", error);
      } finally {
        checking = false;
      }
    };

    // Supabase auth callbacks must not await other auth calls directly.
    const scheduleCheck = () => {
      window.setTimeout(() => void check(), 0);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleCheck();
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        scheduleCheck();
      }
    });
    const intervalId = window.setInterval(scheduleCheck, CHECK_INTERVAL_MS);
    window.addEventListener("focus", scheduleCheck);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", scheduleCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
