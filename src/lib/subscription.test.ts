import { describe, expect, it } from "vitest";
import { getSubscriptionDaysRemaining, PLAN_PRICES } from "./subscription";

describe("subscription pricing", () => {
  it("waits for App Store pricing instead of displaying a fabricated currency", () => {
    expect(PLAN_PRICES.weekly).toEqual({
      label: "Weekly",
      price: "—",
      per: "/week",
      subtitle: "Loading App Store price…",
    });
    expect(PLAN_PRICES.monthly.price).toBe("—");
    expect(PLAN_PRICES.yearly.price).toBe("—");
  });

  it("reports whole subscription days remaining from RevenueCat expiry dates", () => {
    const now = Date.UTC(2026, 7, 27, 12, 0, 0);

    expect(getSubscriptionDaysRemaining("2026-08-30T12:00:00.000Z", now)).toBe(3);
    expect(getSubscriptionDaysRemaining("2026-08-27T11:59:59.000Z", now)).toBe(0);
    expect(getSubscriptionDaysRemaining("not-a-date", now)).toBeNull();
  });
});
