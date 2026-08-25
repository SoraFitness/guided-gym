import { describe, expect, it } from "vitest";
import { PLAN_PRICES } from "./subscription";

describe("subscription pricing", () => {
  it("does not display a USD price before RevenueCat returns storefront pricing", () => {
    expect(PLAN_PRICES.weekly).toEqual({
      label: "Weekly",
      price: "—",
      per: "",
      subtitle: "Loading your local price…",
    });
    expect(PLAN_PRICES.monthly.price).toBe("—");
    expect(PLAN_PRICES.yearly.price).toBe("—");
  });
});
