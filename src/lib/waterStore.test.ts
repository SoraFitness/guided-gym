import { describe, expect, it } from "vitest";
import { formatWater, waterGoalMl, waterOn, waterQuickAddsMl, waterTotalMl } from "./waterStore";

describe("waterGoalMl", () => {
  it("scales with body weight and training", () => {
    const light = waterGoalMl({ currentWeightKg: 60, daysPerWeek: 2, sessionMinutes: 20 });
    const heavy = waterGoalMl({ currentWeightKg: 100, daysPerWeek: 6, sessionMinutes: 60 });
    expect(light).toBe(2050);
    expect(heavy).toBe(3900);
  });

  it("stays in a sensible range", () => {
    expect(waterGoalMl({ currentWeightKg: 30, daysPerWeek: 2, sessionMinutes: 20 })).toBe(1500);
    expect(waterGoalMl({ currentWeightKg: 300, daysPerWeek: 6, sessionMinutes: 60 })).toBe(5000);
  });
});

describe("water log helpers", () => {
  it("counts only the day being viewed", () => {
    const entries = [
      { id: "a", ml: 500, loggedAt: new Date(2026, 10, 2, 9).toISOString() },
      { id: "b", ml: 250, loggedAt: new Date(2026, 10, 2, 21).toISOString() },
      { id: "c", ml: 750, loggedAt: new Date(2026, 10, 1, 9).toISOString() },
    ];
    expect(waterTotalMl(waterOn(entries, new Date(2026, 10, 2, 12)))).toBe(750);
  });

  it("formats and offers amounts in the member's units", () => {
    expect(formatWater(1250, "metric")).toBe("1.25 L");
    expect(formatWater(250, "metric")).toBe("250 ml");
    expect(formatWater(waterQuickAddsMl("imperial")[0], "imperial")).toBe("8 oz");
  });
});
