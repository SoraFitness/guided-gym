import { invokeEdgeFunction } from "./edge-functions.server";

export interface SubscriptionAccess {
  active: boolean;
  expiresAt: string | null;
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

export async function getSubscriptionAccess(accessToken: string) {
  try {
    return await invokeEdgeFunction<SubscriptionAccess>("subscription-access", accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("active Ascendr subscription")) return { active: false, expiresAt: null };
    throw new SubscriptionVerificationError();
  }
}

export async function requireActiveSubscription(accessToken: string) {
  const access = await getSubscriptionAccess(accessToken);
  if (!access.active) throw new SubscriptionRequiredError();
  return access;
}
