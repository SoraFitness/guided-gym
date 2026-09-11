// Pure subscription state derived from the RevenueCat entitlement, kept free of native
// imports so it can be unit tested.

export const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

const DAY_MS = 24 * 60 * 60 * 1000;
const ENDING_SOON_DAYS = 3;

/** The entitlement fields RevenueCat reports for the member. */
export interface EntitlementSnapshot {
  isActive: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  billingIssueDetectedAt: string | null;
}

export interface SubscriptionStatus {
  active: boolean;
  expiresAt: string | null;
  willRenew: boolean | null;
  /** The member subscribed before and their access has since ended. */
  renewalRequired: boolean;
  /** Apple couldn't charge the renewal; access may still be active during the grace period. */
  billingIssue: boolean;
}

export type SubscriptionNotice = { kind: "billing" } | { kind: "ending"; daysRemaining: number };

export function subscriptionStatusFromEntitlement(
  entitlement: EntitlementSnapshot | undefined,
): SubscriptionStatus {
  const active = entitlement?.isActive === true;
  return {
    active,
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: active ? (entitlement?.willRenew ?? null) : null,
    renewalRequired: !active && Boolean(entitlement?.expirationDate),
    billingIssue: Boolean(entitlement?.billingIssueDetectedAt),
  };
}

/** A heads-up for an active member whose access is about to end or failed to renew. */
export function subscriptionNotice(
  status: Pick<SubscriptionStatus, "active" | "expiresAt" | "willRenew" | "billingIssue">,
  now = Date.now(),
): SubscriptionNotice | null {
  if (!status.active) return null;
  if (status.billingIssue) return { kind: "billing" };
  if (status.willRenew !== false || !status.expiresAt) return null;
  const expiresAtMs = Date.parse(status.expiresAt);
  if (Number.isNaN(expiresAtMs)) return null;
  const daysRemaining = Math.max(0, Math.ceil((expiresAtMs - now) / DAY_MS));
  return daysRemaining <= ENDING_SOON_DAYS ? { kind: "ending", daysRemaining } : null;
}
