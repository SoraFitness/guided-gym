import { describe, expect, it } from "vitest";
import type { Profile } from "./profile";
import { nutritionGoalType, suggestNutrition } from "./nutritionService";

const inFourMonths = new Date();
inFourMonths.setDate(inFourMonths.getDate() + 120);

const profile: Profile = {
  name: "Member",
  goal: "build_muscle",
  experience: "intermediate",
  equipment: "gym",
  daysPerWeek: 4,
  sessionMinutes: 45,
  focusAreas: ["chest", "back", "legs"],
  currentWeightKg: 90,
  goalWeightKg: 82,
  heightCm: 180,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goalTargetDate: inFourMonths.toISOString(),
  deficitSplit: "balanced",
  nutritionPlan: "fat_loss",
  completedAt: "2026-09-10T12:00:00.000Z",
};

describe("daily nutrition targets", () => {
  it("drives calories from the nutrition plan chosen in onboarding", () => {
    expect(nutritionGoalType(profile)).toBe("lose_weight");
    expect(nutritionGoalType({ ...profile, nutritionPlan: "custom" })).toBe("build_muscle");
  });

  it("keeps protein, carbs, and fat adding up to the calorie target", () => {
    for (const observedMaintenance of [undefined, 2600, 3200]) {
      const goals = suggestNutrition(profile, observedMaintenance);
      const macroKcal = goals.protein * 4 + goals.carbs * 4 + goals.fat * 9;
      expect(Math.abs(macroKcal - goals.kcal)).toBeLessThanOrEqual(12);
    }
  });

  it("recalibrates calories from the maintenance observed in logged data", () => {
    expect(suggestNutrition(profile, 3200).kcal).toBeGreaterThan(
      suggestNutrition(profile, 2400).kcal,
    );
  });
});
