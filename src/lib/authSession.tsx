import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthSession {
  userId: string;
  accessToken: string;
  email: string | null;
  isAnonymous: boolean;
}

export type AuthSessionState = AuthSession | null | "loading";
export const NATIVE_AUTH_CALLBACK_URL = "ascendr://auth/callback";

type NativeAuthCallback =
  | { type: "code"; code: string }
  | { type: "tokens"; accessToken: string; refreshToken: string }
  | { type: "error"; description: string }
  | null;

let nativeAuthCallbackListener: Promise<void> | null = null;

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  return {
    userId: session.user.id,
    accessToken: session.access_token,
    email: session.user.email ?? null,
    isAnonymous: session.user.is_anonymous === true,
  };
}

export function isAccountSession(session: AuthSessionState): session is AuthSession {
  return session !== null && session !== "loading" && !session.isAnonymous;
}

export function getAuthRedirectUrl(webPath: string) {
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_CALLBACK_URL;
  if (typeof window === "undefined") return webPath;
  return new URL(webPath, window.location.origin).toString();
}

export function parseNativeAuthCallback(callbackUrl: string): NativeAuthCallback {
  try {
    const url = new URL(callbackUrl);
    if (url.protocol !== "ascendr:" || url.hostname !== "auth" || url.pathname !== "/callback") {
      return null;
    }

    const hash = new URLSearchParams(url.hash.slice(1));
    const description =
      url.searchParams.get("error_description") ?? hash.get("error_description") ?? null;
    if (description) return { type: "error", description };

    const code = url.searchParams.get("code");
    if (code) return { type: "code", code };

    const accessToken = url.searchParams.get("access_token") ?? hash.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token") ?? hash.get("refresh_token");
    if (accessToken && refreshToken) return { type: "tokens", accessToken, refreshToken };
  } catch {
    return null;
  }

  return null;
}

async function completeNativeAuthCallback(callbackUrl: string) {
  const callback = parseNativeAuthCallback(callbackUrl);
  if (!callback) return;

  if (callback.type === "error") {
    console.warn("[auth] Native callback failed", callback.description);
    return;
  }

  const result =
    callback.type === "code"
      ? await supabase.auth.exchangeCodeForSession(callback.code)
      : await supabase.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        });
  if (result.error) console.warn("[auth] Native callback session exchange failed", result.error);
}

export function startNativeAuthCallbackListener() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (nativeAuthCallbackListener) return nativeAuthCallbackListener;

  nativeAuthCallbackListener = (async () => {
    await App.addListener("appUrlOpen", ({ url }) => {
      void completeNativeAuthCallback(url);
    });

    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) await completeNativeAuthCallback(launchUrl.url);
  })();

  return nativeAuthCallbackListener;
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<AuthSessionState>("loading");

  useEffect(() => {
    let mounted = true;

    try {
      void startNativeAuthCallbackListener().catch((error: unknown) => {
        console.warn("[auth] Native callback listener is unavailable", error);
      });

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
