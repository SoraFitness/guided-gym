import type { Profile } from "./profile";
import type { NutritionGoals } from "./foods";
import { computePlan, macrosFromPlan } from "./calorieEngine";

/** The goal that drives calories: the nutrition plan chosen in onboarding, else the main goal. */
export function nutritionGoalType(profile: Profile): Profile["goal"] {
  return profile.nutritionPlan === "fat_loss"
    ? "lose_weight"
    : profile.nutritionPlan === "muscle_gain"
      ? "build_muscle"
      : profile.nutritionPlan === "maintenance"
        ? "maintain"
        : profile.goal;
}

/**
 * Compute personalized daily nutrition targets from a Profile by running the
 * full calorie engine (BMR → TDEE → goal-driven deficit/surplus → split → macros).
 * No hardcoded ±kcal numbers — everything is derived from profile data and the
 * goal weight + target date. Pass an observed maintenance to recalibrate from
 * logged intake and weight.
 */
/** The full calorie plan (pace, warnings, effective goal) behind the daily targets. */
export function nutritionPlanFor(profile: Profile, observedMaintenanceKcal?: number) {
  const targetDate = profile.goalTargetDate
    ? new Date(profile.goalTargetDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 84);
        return d;
      })();
  return computePlan({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goalType: nutritionGoalType(profile),
    activity: profile.activityLevel,
    targetDate,
    splitPreset: profile.deficitSplit,
    bulkPace: profile.bulkPace,
    observedMaintenanceKcal,
  });
}

export function suggestNutrition(
  profile: Profile,
  observedMaintenanceKcal?: number,
): NutritionGoals {
  const plan = nutritionPlanFor(profile, observedMaintenanceKcal);
  return macrosFromPlan(plan, profile.currentWeightKg, {
    heightCm: profile.heightCm,
    goalWeightKg: profile.goalWeightKg,
  });
}
