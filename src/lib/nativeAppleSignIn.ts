import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const APPLE_BUNDLE_ID = "com.ascendr.org";
const NATIVE_AUTH_CALLBACK_URL = "ascendr://auth/callback";
const APPLE_CANCELLATION_ERROR_CODE = 1001;

export interface NativeAppleSignInResult {
  cancelled: boolean;
  email: string | null;
  fullName: string | null;
  user: User | null;
}

interface NativeAppleSignInOptions {
  linkIdentity?: boolean;
}

export function isNativeAppleSignInAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function generateRawNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isCancellation(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return Number((error as { code?: unknown }).code) === APPLE_CANCELLATION_ERROR_CODE;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /cancel(?:led|ed)|authorizationerror\.?canceled|\b1001\b/i.test(message);
}

function getFullName(givenName: string | null, familyName: string | null) {
  const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
  return fullName || null;
}

export async function signInWithNativeApple({
  linkIdentity = false,
}: NativeAppleSignInOptions = {}): Promise<NativeAppleSignInResult> {
  if (!isNativeAppleSignInAvailable()) {
    throw new Error("Native Sign in with Apple is only available in the Ascendr iOS app.");
  }
  if (!crypto?.getRandomValues || !crypto?.subtle) {
    throw new Error("Secure Sign in with Apple is unavailable on this device.");
  }

  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  let credential;
  try {
    credential = await SignInWithApple.authorize({
      clientId: APPLE_BUNDLE_ID,
      redirectURI: NATIVE_AUTH_CALLBACK_URL,
      scopes: "email name",
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isCancellation(error)) {
      return { cancelled: true, email: null, fullName: null, user: null };
    }
    throw error;
  }

  const identityToken = credential.response.identityToken?.trim();
  if (!identityToken) {
    throw new Error("Apple did not provide an identity token. Please try again.");
  }

  const credentials = {
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
    access_token: credential.response.authorizationCode || undefined,
  } as const;
  let user: User | null;
  if (linkIdentity) {
    const { data, error } = await supabase.auth.linkIdentity(credentials);
    if (error) throw error;
    user = (data as { user?: User }).user ?? null;
  } else {
    const { data, error } = await supabase.auth.signInWithIdToken(credentials);
    if (error) throw error;
    user = data.user;
  }

  const fullName = getFullName(credential.response.givenName, credential.response.familyName);
  if (fullName) {
    const { error: profileError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: credential.response.givenName,
        family_name: credential.response.familyName,
      },
    });
    if (profileError) console.warn("[auth] Could not save the Apple display name", profileError);
  }

  return {
    cancelled: false,
    email: credential.response.email ?? user?.email ?? null,
    fullName,
    user,
  };
}
