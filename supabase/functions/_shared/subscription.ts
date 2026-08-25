import { optionalEnv, requiredEnv } from "./env.ts";

export interface SubscriptionAccess {
  active: boolean;
  expiresAt: string | null;
}

interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: { entitlements?: Record<string, RevenueCatEntitlement> };
}

export class SubscriptionRequiredError extends Error {
  constructor() {
    super("An active Ascendr subscription is required.");
  }
}

export class SubscriptionVerificationError extends Error {
  constructor() {
    super("Subscription verification is temporarily unavailable. Please try again.");
  }
}

function futureDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${requiredEnv("REVENUECAT_SECRET_API_KEY")}` },
      cache: "no-store",
    },
  ).catch((error) => {
    console.error("[revenuecat] request failed", error);
    throw new SubscriptionVerificationError();
  });

  if (!response.ok) {
    console.error("[revenuecat] verification failed", response.status);
    throw new SubscriptionVerificationError();
  }

  let payload: RevenueCatSubscriberResponse;
  try {
    payload = (await response.json()) as RevenueCatSubscriberResponse;
  } catch {
    throw new SubscriptionVerificationError();
  }

  const entitlementId = optionalEnv("REVENUECAT_ENTITLEMENT_ID") || "pro";
  const entitlement = payload.subscriber?.entitlements?.[entitlementId];
  if (!entitlement) return { active: false, expiresAt: null };
  if (entitlement.expires_date === null) return { active: true, expiresAt: null };

  const expiry = [
    futureDate(entitlement.expires_date),
    futureDate(entitlement.grace_period_expires_date),
  ]
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0];
  if (!expiry) return { active: false, expiresAt: null };

  return { active: expiry.getTime() > Date.now(), expiresAt: expiry.toISOString() };
}

export async function requireActiveSubscription(userId: string) {
  const access = await getSubscriptionAccess(userId);
  if (!access.active) throw new SubscriptionRequiredError();
  return access;
}

export function openRouterKeyFor(operation: string) {
  if (operation === "body-scan" || operation === "body-scan-preview") {
    return optionalEnv("OPENROUTER_BODY_SCAN_API_KEY") || optionalEnv("OPENROUTER_API_KEY");
  }
  if (operation === "face-scan") {
    return optionalEnv("OPENROUTER_FACE_SCAN_API_KEY") || optionalEnv("OPENROUTER_API_KEY");
  }
  return optionalEnv("OPENROUTER_API_KEY");
}
