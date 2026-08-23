// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import { scoreLogEntries, scoreNutritionQuality } from "./nutritionQuality";
import type { LogEntry } from "./foods";

describe("nutrition quality", () => {
  beforeEach(() => localStorage.clear());

  it("awards a verified excellent score at favourable label thresholds", () => {
    const result = scoreNutritionQuality({
      kcal: 500,
      protein: 35,
      proteinGoal: 140,
      meal: "Lunch",
      nutrients: {
        fiberG: 4.2,
        sugarsG: 5,
        saturatedFatG: 1,
        sodiumMg: 115,
        provenance: "verified",
      },
    });
    expect(result.score).toBe(100);
    expect(result.band).toBe("Excellent");
    expect(result.confidence).toBe("verified");
  });

  it("uses the 5 to 15 percent daily-value range for limit nutrients", () => {
    const result = scoreNutritionQuality({
      kcal: 400,
      protein: 0,
      proteinGoal: 140,
      meal: "Dinner",
      nutrients: {
        fiberG: 0,
        sugarsG: 15,
        saturatedFatG: 3,
        sodiumMg: 345,
        provenance: "verified",
      },
    });
    expect(result.score).toBe(0);
    expect(result.watchItems).toEqual(
      expect.arrayContaining(["Sugars are high for one serving", "Sodium is high for one serving"]),
    );
  });

  it("marks macro-only legacy food as partial instead of inventing nutrients", () => {
    const result = scoreNutritionQuality({
      kcal: 300,
      protein: 35,
      proteinGoal: 140,
      meal: "Breakfast",
    });
    expect(result.score).toBe(100);
    expect(result.confidence).toBe("partial");
    expect(result.dimensions).toEqual({ protein: 100 });
  });

  it("aggregates meal and day quality while accepting legacy log entries", () => {
    const entries: LogEntry[] = [
      {
        id: "legacy",
        meal: "Breakfast",
        servings: 1,
        loggedAt: "2026-08-21T08:00:00.000Z",
        custom: {
          name: "Legacy oats",
          serving: "1 bowl",
          kcal: 300,
          protein: 20,
          carbs: 45,
          fat: 5,
          source: "manual",
        },
      },
      {
        id: "verified",
        meal: "Lunch",
        servings: 1,
        loggedAt: "2026-08-21T12:00:00.000Z",
        custom: {
          name: "Bean bowl",
          serving: "1 bowl",
          kcal: 500,
          protein: 35,
          carbs: 60,
          fat: 12,
          source: "barcode",
          nutrients: {
            fiberG: 10,
            sugarsG: 4,
            saturatedFatG: 1,
            sodiumMg: 220,
            provenance: "verified",
          },
        },
      },
    ];
    const result = scoreLogEntries(entries, 140);
    expect(result.meals.Breakfast?.quality.confidence).toBe("partial");
    expect(result.meals.Lunch?.quality.confidence).toBe("verified");
    expect(result.day.score).not.toBeNull();
  });
});
