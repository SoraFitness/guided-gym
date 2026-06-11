import type { Profile, Gender, NutritionPlan, Goal } from "./profile";
import type { NutritionGoals } from "./foods";

/**
 * Compute personalized daily nutrition targets from a Profile.
 * Uses Mifflin-St Jeor BMR × activity multiplier, then adjusts by goal
 * and the user's chosen nutrition plan.
 */
export function suggestNutrition(profile: Profile): NutritionGoals {
  const bmr = mifflinStJeor(profile.gender, profile.currentWeightKg, profile.heightCm, profile.age);
  const activity = activityMultiplier(profile.daysPerWeek);
  let tdee = bmr * activity;

  // Plan overrides goal-based math (if user said "fat loss" explicitly etc.)
  const plan = effectivePlan(profile.goal, profile.nutritionPlan);
  if (plan === "fat_loss") tdee -= 400;
  else if (plan === "muscle_gain") tdee += 250;

  const kcal = Math.round(Math.max(1200, tdee));

  // Protein: 1.6 g/kg base; bump for muscle gain / recomp
  const proteinPerKg = plan === "muscle_gain" ? 2.0 : plan === "fat_loss" ? 2.2 : 1.8;
  const protein = Math.round(profile.currentWeightKg * proteinPerKg);

  // Fat: 25% of calories (muscle_gain) up to 30% (other)
  const fatPct = plan === "muscle_gain" ? 0.25 : 0.28;
  const fat = Math.round((kcal * fatPct) / 9);

  // Remaining → carbs
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

function mifflinStJeor(gender: Gender, kg: number, cm: number, age: number) {
  const base = 10 * kg + 6.25 * cm - 5 * age;
  return gender === "male" ? base + 5 : gender === "female" ? base - 161 : base - 78;
}
function activityMultiplier(days: number) {
  if (days <= 2) return 1.375;
  if (days <= 4) return 1.55;
  return 1.725;
}
function effectivePlan(goal: Goal, plan: NutritionPlan): "fat_loss" | "muscle_gain" | "maintenance" {
  if (plan === "fat_loss" || plan === "muscle_gain" || plan === "maintenance") return plan;
  // custom → derive from goal
  if (goal === "lose_weight") return "fat_loss";
  if (goal === "build_muscle") return "muscle_gain";
  return "maintenance";
}
