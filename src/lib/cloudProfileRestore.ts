import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { claimLocalDataOwnership } from "./accountOwnership";
import { isAccountSession, type AuthSessionState } from "./authSession";
import { readStoredProfile, writeStoredProfile, type Profile } from "./profile";

// A member who signs in on a new device (or after reinstalling) has no local
// profile yet. Screens that would send them to onboarding first copy their
// saved profile down from Supabase.

const RESTORE_TIMEOUT_MS = 10_000;
const restoresInFlight = new Map<string, Promise<boolean>>();

async function loadCloudProfile(userId: string): Promise<boolean> {
  // Another account's data may still be on this device. Clearing it reloads the
  // page, and the restore runs again once this account owns local storage.
  if (claimLocalDataOwnership(userId)) {
    window.location.reload();
    return new Promise<boolean>(() => {});
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const cloudProfile = data?.profile as Profile | null | undefined;
  if (!cloudProfile || typeof cloudProfile !== "object" || !cloudProfile.name) return false;
  if (!readStoredProfile()) writeStoredProfile(cloudProfile);
  return true;
}

/** Resolves true when the member's saved profile is on this device. */
export function restoreCloudProfile(userId: string): Promise<boolean> {
  const inFlight = restoresInFlight.get(userId);
  if (inFlight) return inFlight;

  const restore = new Promise<boolean>((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error("Restoring the saved profile timed out.")),
      RESTORE_TIMEOUT_MS,
    );
    loadCloudProfile(userId).then(
      (restored) => {
        window.clearTimeout(timeoutId);
        resolve(restored);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  }).finally(() => restoresInFlight.delete(userId));

  restoresInFlight.set(userId, restore);
  return restore;
}

export interface CloudProfileRestore {
  /** Still checking whether a signed-in member without a local profile has a saved one. */
  pending: boolean;
  /** The member's saved profile was copied onto this device. */
  restored: boolean;
}

export function useCloudProfileRestore(
  session: AuthSessionState,
  profile: Profile | null,
  ready: boolean,
): CloudProfileRestore {
  const userId = isAccountSession(session) ? session.userId : null;
  const [result, setResult] = useState<{ userId: string; restored: boolean } | null>(null);
  const settled = userId !== null && result?.userId === userId;
  const needsRestore = ready && !profile && userId !== null && !settled;

  useEffect(() => {
    if (!needsRestore || !userId) return;
    void restoreCloudProfile(userId).then(
      (restored) => setResult({ userId, restored }),
      (error: unknown) => {
        console.warn("[profile] Could not restore the saved profile", error);
        setResult({ userId, restored: false });
      },
    );
  }, [needsRestore, userId]);

  return {
    pending: ready && !profile && (session === "loading" || needsRestore),
    restored: settled && result?.restored === true,
  };
}
