import type { Profile } from "./profile";
import type { NutritionGoals } from "./foods";
import { computePlan, macrosFromPlan } from "./calorieEngine";

/**
 * Compute personalized daily nutrition targets from a Profile by running the
 * full calorie engine (BMR → TDEE → goal-driven deficit/surplus → split → macros).
 * No hardcoded ±kcal numbers — everything is derived from profile data and the
 * goal weight + target date.
 */
export function suggestNutrition(profile: Profile): NutritionGoals {
  const targetDate = profile.goalTargetDate
    ? new Date(profile.goalTargetDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 84);
        return d;
      })();

  const nutritionGoal: Profile["goal"] =
    profile.nutritionPlan === "fat_loss"
      ? "lose_weight"
      : profile.nutritionPlan === "muscle_gain"
        ? "build_muscle"
        : profile.nutritionPlan === "maintenance"
          ? "maintain"
          : profile.goal;

  const plan = computePlan({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goalType: nutritionGoal,
    activity: profile.activityLevel,
    targetDate,
    splitPreset: profile.deficitSplit,
    bulkPace: profile.bulkPace,
  });

  return macrosFromPlan(plan, profile.currentWeightKg);
}
