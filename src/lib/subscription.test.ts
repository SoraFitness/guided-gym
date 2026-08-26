import { describe, expect, it } from "vitest";
import { PLAN_PRICES } from "./subscription";

describe("subscription pricing", () => {
  it("displays the fixed USD price while checkout initializes", () => {
    expect(PLAN_PRICES.weekly).toEqual({
      label: "Weekly",
      price: "US$9.99",
      per: "/week",
      subtitle: "Billed weekly in USD",
    });
    expect(PLAN_PRICES.monthly.price).toBe("US$19.99");
    expect(PLAN_PRICES.yearly.price).toBe("US$49.99");
  });
});
