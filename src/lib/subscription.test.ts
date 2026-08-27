import { describe, expect, it } from "vitest";
import { PLAN_PRICES } from "./subscription";

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
});
