import { describe, expect, it } from "vitest";
import { buildOnboardingResponseSnapshot } from "./onboardingAnalytics";

describe("onboarding analytics", () => {
  it("creates a product-insights snapshot without direct or sensitive profile details", () => {
    const snapshot = buildOnboardingResponseSnapshot({
      goal: "build_muscle",
      goals: ["build_muscle", "get_stronger"],
      experience: "intermediate",
      equipment: "gym",
      daysPerWeek: 4,
      sessionMinutes: 45,
      currentWorkoutsPerWeek: 3,
      focusAreas: ["chest", "back"],
      gender: "other",
      activityLevel: "moderate",
      nutritionPlan: "muscle_gain",
      units: "metric",
      motivation: "feel_confident",
      hasTrainingLimitations: true,
      referralSource: "instagram",
      // These values model fields on the live draft that must never be persisted here.
      name: "Private Name",
      currentWeightKg: 76,
      limitationNotes: "Private free text",
    } as Parameters<typeof buildOnboardingResponseSnapshot>[0]);

    expect(snapshot).toMatchObject({
      goal: "build_muscle",
      motivation: "feel_confident",
      hasTrainingLimitations: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain("Private Name");
    expect(JSON.stringify(snapshot)).not.toContain("Private free text");
    expect(JSON.stringify(snapshot)).not.toContain("76");
  });
});
