// Bridge to the native TikTok App Events SDK.
//
// Only the moments the native layer cannot see on its own are sent from here:
// registration, trial start and subscription. Install, app open and 2-day retention
// are reported by the SDK itself inside the iOS app, so nothing in this file touches
// them. No TikTok credential is referenced here — the App ID and access token live in
// the native build configuration, never in this bundle.
//
// Everything is fire-and-forget: on the web, on Android, or in a build without TikTok
// configured, these resolve to no-ops and never surface an error to the caller.

import { Capacitor, registerPlugin } from "@capacitor/core";

interface TikTokEventsPlugin {
  getStatus(): Promise<{
    configured: boolean;
    initialized: boolean;
    trackingEnabled: boolean;
    userTrackingEnabled: boolean;
    debugMode: boolean;
    sdkVersion: string;
  }>;
  requestTrackingAuthorization(): Promise<{ status: number }>;
  identify(options: {
    externalId?: string;
    userName?: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<void>;
  logout(): Promise<void>;
  trackRegistration(options: { userId: string; method?: string }): Promise<{ reported: boolean }>;
  trackTrialStarted(options: {
    dedupeKey: string;
    productId?: string;
    value?: number;
    currency?: string;
  }): Promise<{ reported: boolean }>;
  trackSubscription(options: {
    dedupeKey: string;
    productId?: string;
    value?: number;
    currency?: string;
  }): Promise<{ reported: boolean }>;
  flush(): Promise<void>;
}

const TikTokEvents = registerPlugin<TikTokEventsPlugin>("TikTokEvents");

function isSupported() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "ios"
  );
}

/** Runs a plugin call without letting an analytics failure reach the caller. */
async function safely(action: string, run: () => Promise<unknown>) {
  if (!isSupported()) return;
  try {
    await run();
  } catch (error) {
    console.warn(`[tiktok] ${action} failed`, error);
  }
}

/**
 * Links the signed-in member to TikTok's identity graph, improving match rates for
 * events reported after this point. Call on sign-in as well as sign-up.
 */
export async function identifyTikTokUser(userId: string, email: string | null) {
  await safely("identify", () =>
    TikTokEvents.identify({ externalId: userId, email: email ?? undefined }),
  );
}

export async function logoutTikTokUser() {
  await safely("logout", () => TikTokEvents.logout());
}

/**
 * TikTok standard `Registration` event. The native side keeps a per-account marker,
 * so calling this on every sign-in still reports at most one event per member.
 */
export async function trackTikTokRegistration(userId: string, method?: string) {
  await safely("trackRegistration", () => TikTokEvents.trackRegistration({ userId, method }));
}

/**
 * TikTok standard `StartTrial` event. Deduplicated natively against `dedupeKey`.
 */
export async function trackTikTokTrialStarted(options: {
  dedupeKey: string;
  productId?: string;
  value?: number;
  currency?: string;
}) {
  await safely("trackTrialStarted", () => TikTokEvents.trackTrialStarted(options));
}

/**
 * TikTok standard `Subscribe` event, plus a `Purchase` event carrying revenue when a
 * price is known. Deduplicated natively against `dedupeKey`.
 */
export async function trackTikTokSubscription(options: {
  dedupeKey: string;
  productId?: string;
  value?: number;
  currency?: string;
}) {
  await safely("trackSubscription", () => TikTokEvents.trackSubscription(options));
}

/**
 * Shows the App Tracking Transparency prompt if it has not been answered. The app also
 * asks natively when it becomes active; this exists so the prompt can be moved to a
 * better moment (for example after onboarding) without touching native code.
 */
export async function requestTikTokTrackingAuthorization() {
  await safely("requestTrackingAuthorization", () => TikTokEvents.requestTrackingAuthorization());
}

/** Diagnostics for manual verification; returns null when TikTok is unavailable. */
export async function getTikTokStatus() {
  if (!isSupported()) return null;
  try {
    return await TikTokEvents.getStatus();
  } catch (error) {
    console.warn("[tiktok] getStatus failed", error);
    return null;
  }
}
