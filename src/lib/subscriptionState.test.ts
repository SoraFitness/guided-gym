import { describe, expect, it } from "vitest";
import {
  subscriptionNotice,
  subscriptionStatusFromEntitlement,
  type EntitlementSnapshot,
} from "./subscriptionState";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-11T12:00:00.000Z");
const entitlement = (overrides: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot => ({
  isActive: true,
  expirationDate: new Date(now + 20 * DAY).toISOString(),
  willRenew: true,
  billingIssueDetectedAt: null,
  ...overrides,
});

describe("subscription status", () => {
  it("treats a member without an entitlement as never subscribed", () => {
    expect(subscriptionStatusFromEntitlement(undefined)).toEqual({
      active: false,
      expiresAt: null,
      willRenew: null,
      renewalRequired: false,
      billingIssue: false,
    });
  });

  it("marks a lapsed membership as needing renewal and keeps when it ended", () => {
    const endedAt = new Date(now - 2 * DAY).toISOString();
    const status = subscriptionStatusFromEntitlement(
      entitlement({ isActive: false, expirationDate: endedAt, willRenew: false }),
    );
    expect(status.active).toBe(false);
    expect(status.renewalRequired).toBe(true);
    expect(status.expiresAt).toBe(endedAt);
  });

  it("keeps active members out of the renewal state", () => {
    const status = subscriptionStatusFromEntitlement(entitlement());
    expect(status.active).toBe(true);
    expect(status.renewalRequired).toBe(false);
    expect(status.willRenew).toBe(true);
  });

  it("flags a billing issue while access is still active", () => {
    const status = subscriptionStatusFromEntitlement(
      entitlement({ billingIssueDetectedAt: new Date(now - DAY).toISOString() }),
    );
    expect(status.active).toBe(true);
    expect(status.billingIssue).toBe(true);
  });
});

describe("subscription notice", () => {
  it("warns when auto-renew is off and access ends within three days", () => {
    const status = subscriptionStatusFromEntitlement(
      entitlement({ willRenew: false, expirationDate: new Date(now + 2.5 * DAY).toISOString() }),
    );
    expect(subscriptionNotice(status, now)).toEqual({ kind: "ending", daysRemaining: 3 });
  });

  it("stays quiet for renewing members and for access that ends later", () => {
    expect(subscriptionNotice(subscriptionStatusFromEntitlement(entitlement()), now)).toBeNull();
    const later = subscriptionStatusFromEntitlement(
      entitlement({ willRenew: false, expirationDate: new Date(now + 10 * DAY).toISOString() }),
    );
    expect(subscriptionNotice(later, now)).toBeNull();
  });

  it("puts a payment problem first", () => {
    const status = subscriptionStatusFromEntitlement(
      entitlement({ willRenew: false, billingIssueDetectedAt: new Date(now).toISOString() }),
    );
    expect(subscriptionNotice(status, now)).toEqual({ kind: "billing" });
  });

  it("leaves ended memberships to the renewal screen", () => {
    const status = subscriptionStatusFromEntitlement(
      entitlement({ isActive: false, expirationDate: new Date(now - DAY).toISOString() }),
    );
    expect(subscriptionNotice(status, now)).toBeNull();
  });
});
