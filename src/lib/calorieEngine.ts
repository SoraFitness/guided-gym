// Calorie & goal engine — pure functions, no side effects.
// All math derives from user profile + goal weight + target date.
// No hardcoded calorie or burn numbers anywhere downstream.

import type { Gender, Goal } from "./profile";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "athlete";
export type DeficitSplit = "mostly_diet" | "balanced" | "mostly_exercise";
export type BulkPace = "lean" | "faster";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very: "Very active",
  athlete: "Athlete",
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: "Desk job, little or no exercise",
  light: "Light exercise 1–3 days / week",
  moderate: "Moderate exercise 3–5 days / week",
  very: "Hard exercise 6–7 days / week",
  athlete: "Twice-a-day training or physical job",
};

export const SPLIT_LABELS: Record<DeficitSplit, string> = {
  mostly_diet: "Mostly diet",
  balanced: "Balanced",
  mostly_exercise: "Mostly exercise",
};

export const SPLIT_RATIOS: Record<DeficitSplit, { food: number; exercise: number }> = {
  mostly_diet: { food: 0.9, exercise: 0.1 },
  balanced: { food: 0.7, exercise: 0.3 },
  mostly_exercise: { food: 0.5, exercise: 0.5 },
};

// ---------- Unit conversions ----------
export const lbsToKg = (lb: number) => lb / 2.2046226218;
export const kgToLbs = (kg: number) => kg * 2.2046226218;
export const inToCm = (inches: number) => inches * 2.54;
export const cmToIn = (cm: number) => cm / 2.54;
export const cmToFtIn = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), in: total % 12, totalIn: total };
};

// ---------- BMR / TDEE ----------
export function bmrMifflin({
  gender,
  weightKg,
  heightCm,
  age,
}: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") return base + 5;
  if (gender === "female") return base - 161;
  // Non-binary / "other" — use the midpoint to avoid biasing either way.
  return base - 78;
}

export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity];
}

// ---------- Goal math ----------
export const KCAL_PER_KG_FAT = 7700; // ~3500 per lb — heuristic, metabolism shifts as weight changes

export const weightDeltaKg = (currentKg: number, goalKg: number) => currentKg - goalKg;
export const estimatedTotalDeficitKcal = (deltaKg: number) => deltaKg * KCAL_PER_KG_FAT;

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

// Safe maximum weekly weight change in kg.
// Conservative: min(1% bodyweight/week, 1 kg/week) for fat loss;
// for gain ~0.5% bodyweight/week (lean) capped at 0.45 kg/week (~1 lb).
export function maxWeeklyLossKg(currentKg: number) {
  return Math.min(currentKg * 0.01, 1.0);
}
export function maxWeeklyGainKg(currentKg: number) {
  return Math.min(currentKg * 0.005, 0.45);
}

export function minSafeIntakeKcal(gender: Gender) {
  if (gender === "male") return 1500;
  if (gender === "female") return 1200;
  return 1400;
}

export interface PlanInput {
  gender: Gender;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  goalType: Goal;
  activity: ActivityLevel;
  targetDate: Date;
  splitPreset: DeficitSplit;
  bulkPace?: BulkPace;
  /** Optional override for maintenance (e.g. from weekly recalibration). */
  observedMaintenanceKcal?: number;
}

export interface PlanResult {
  bmrKcal: number;
  formulaMaintenanceKcal: number;
  maintenanceKcal: number; // = observed if provided, else formula
  recommendedIntakeKcal: number;
  dailyDeficitKcal: number; // positive = deficit (loss), negative = surplus (gain), 0 = maintain
  foodDeficitKcal: number; // intake reduction (>=0)
  exerciseBurnTargetKcal: number; // daily burn target (>=0)
  weeklyChangeKg: number; // negative = loss
  weeklyChangeLb: number;
  estimatedGoalDate: Date; // when goal will actually be hit at recommended pace
  targetDate: Date; // what the user asked for
  daysToTarget: number;
  isAggressive: boolean;
  isUnsafe: boolean;
  warnings: string[];
  notes: string[];
  effectiveGoal: "lose" | "gain" | "maintain" | "recomp";
  splitPreset: DeficitSplit;
  safeAlternative?: {
    targetDate: Date;
    weeklyChangeKg: number;
    weeklyChangeLb: number;
    dailyDeficitKcal: number;
    recommendedIntakeKcal: number;
    exerciseBurnTargetKcal: number;
  };
}

function effectiveGoalKind(
  goalType: Goal,
  deltaKg: number,
): "lose" | "gain" | "maintain" | "recomp" {
  if (goalType === "recomp") return "recomp";
  if (goalType === "maintain") return "maintain";
  if (goalType === "build_muscle") return "gain";
  if (goalType === "lose_weight") return "lose";
  // get_stronger / endurance / overall → infer from weight delta
  if (deltaKg > 0.5) return "lose";
  if (deltaKg < -0.5) return "gain";
  return "maintain";
}

export function computePlan(input: PlanInput): PlanResult {
  const {
    gender,
    age,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    goalType,
    activity,
    targetDate,
    splitPreset,
    bulkPace = "lean",
    observedMaintenanceKcal,
  } = input;

  const bmr = bmrMifflin({ gender, weightKg: currentWeightKg, heightCm, age });
  const formulaMaintenance = tdee(bmr, activity);
  const maintenance =
    observedMaintenanceKcal && observedMaintenanceKcal > 0
      ? observedMaintenanceKcal
      : formulaMaintenance;

  const deltaKg = weightDeltaKg(currentWeightKg, goalWeightKg);
  const kind = effectiveGoalKind(goalType, deltaKg);
  const days = daysBetween(new Date(), targetDate);
  const minIntake = minSafeIntakeKcal(gender);
  const split = SPLIT_RATIOS[splitPreset];

  const warnings: string[] = [];
  const notes: string[] = [];

  let intake = maintenance;
  let dailyDeficit = 0;
  let foodDeficit = 0;
  let exerciseBurn = 0;
  let weeklyChangeKg = 0;
  let estimatedGoalDate = new Date(targetDate);
  let isAggressive = false;
  let isUnsafe = false;
  let safeAlt: PlanResult["safeAlternative"];

  if (kind === "maintain") {
    intake = maintenance;
    notes.push("Eating at maintenance preserves your current weight.");
  } else if (kind === "recomp") {
    foodDeficit = Math.round(maintenance * 0.07);
    dailyDeficit = foodDeficit;
    intake = maintenance - foodDeficit;
    weeklyChangeKg = -(dailyDeficit * 7) / KCAL_PER_KG_FAT;
    notes.push("Small ~7% deficit + high protein + lifting drives slow body recomposition.");
  } else if (kind === "gain") {
    const surplusPct = bulkPace === "faster" ? 0.12 : 0.07;
    const surplus = Math.round(maintenance * surplusPct);
    intake = maintenance + surplus;
    dailyDeficit = -surplus;
    weeklyChangeKg = (surplus * 7) / KCAL_PER_KG_FAT;
    notes.push(
      bulkPace === "faster"
        ? "Faster bulk: ~12% surplus — quicker gains, slightly more fat."
        : "Lean bulk: ~7% surplus — slower but cleaner gains.",
    );

    // Safety: don't gain faster than ~0.5%/week of bodyweight
    const maxGain = maxWeeklyGainKg(currentWeightKg);
    if (weeklyChangeKg > maxGain) {
      isAggressive = true;
      warnings.push(
        `Projected gain (${kgToLbs(weeklyChangeKg).toFixed(2)} lb/wk) is faster than recommended. Most of this will be fat.`,
      );
    }
  } else {
    // lose
    const totalDeficitNeeded = estimatedTotalDeficitKcal(deltaKg); // kcal
    dailyDeficit = Math.round(totalDeficitNeeded / days);

    // Safety: cap to safe weekly loss
    const maxWeeklyKg = maxWeeklyLossKg(currentWeightKg);
    const maxDailyDeficit = Math.round((maxWeeklyKg * KCAL_PER_KG_FAT) / 7);

    if (dailyDeficit > maxDailyDeficit) {
      isAggressive = true;
      // Build a safer alternative based on the cap
      const safeWeeklyKg = maxWeeklyKg;
      const safeDailyDeficit = maxDailyDeficit;
      const safeDays = Math.ceil((deltaKg * KCAL_PER_KG_FAT) / safeDailyDeficit);
      const safeDate = addDays(new Date(), safeDays);
      const safeFood = Math.round(safeDailyDeficit * split.food);
      const safeBurn = Math.round(safeDailyDeficit * split.exercise);
      safeAlt = {
        targetDate: safeDate,
        weeklyChangeKg: -safeWeeklyKg,
        weeklyChangeLb: -kgToLbs(safeWeeklyKg),
        dailyDeficitKcal: safeDailyDeficit,
        recommendedIntakeKcal: Math.max(minIntake, Math.round(maintenance - safeFood)),
        exerciseBurnTargetKcal: safeBurn,
      };
      warnings.push(
        `Your target date is aggressive. A safer plan loses about ${kgToLbs(safeWeeklyKg).toFixed(1)} lb/wk and reaches your goal around ${safeDate.toLocaleDateString()}.`,
      );
    }

    foodDeficit = Math.round(dailyDeficit * split.food);
    exerciseBurn = Math.round(dailyDeficit * split.exercise);
    intake = maintenance - foodDeficit;

    if (intake < minIntake) {
      isUnsafe = true;
      const clampedFoodCut = maintenance - minIntake;
      const adjustedBurn = Math.max(0, dailyDeficit - clampedFoodCut);
      warnings.push(
        `Recommended intake fell below the ${minIntake} kcal safety floor for your sex. We've raised intake to ${minIntake} kcal and shifted the rest to workouts.`,
      );
      foodDeficit = Math.max(0, clampedFoodCut);
      exerciseBurn = adjustedBurn;
      intake = minIntake;
    }

    weeklyChangeKg = -((foodDeficit + exerciseBurn) * 7) / KCAL_PER_KG_FAT;
    // Recompute estimated date based on the (possibly clamped) effective deficit
    const effectiveDaily = foodDeficit + exerciseBurn;
    if (effectiveDaily > 0) {
      const realDays = Math.ceil((deltaKg * KCAL_PER_KG_FAT) / effectiveDaily);
      estimatedGoalDate = addDays(new Date(), realDays);
    }

    notes.push(
      `Total estimated deficit: ${Math.round(deltaKg * KCAL_PER_KG_FAT).toLocaleString()} kcal over ${days} days. This is an estimate — metabolism shifts as you lean down.`,
    );
  }

  return {
    bmrKcal: Math.round(bmr),
    formulaMaintenanceKcal: Math.round(formulaMaintenance),
    maintenanceKcal: Math.round(maintenance),
    recommendedIntakeKcal: Math.round(intake),
    dailyDeficitKcal: Math.round(dailyDeficit),
    foodDeficitKcal: Math.round(foodDeficit),
    exerciseBurnTargetKcal: Math.round(exerciseBurn),
    weeklyChangeKg,
    weeklyChangeLb: kgToLbs(weeklyChangeKg),
    estimatedGoalDate,
    targetDate,
    daysToTarget: days,
    isAggressive,
    isUnsafe,
    warnings,
    notes,
    effectiveGoal: kind,
    splitPreset,
    safeAlternative: safeAlt,
  };
}

// ---------- Macros from plan ----------
export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function macrosFromPlan(plan: PlanResult, currentWeightKg: number): MacroTargets {
  const kcal = plan.recommendedIntakeKcal;
  // Protein per kg scales with goal
  const proteinPerKg =
    plan.effectiveGoal === "lose" || plan.effectiveGoal === "recomp"
      ? 2.2
      : plan.effectiveGoal === "gain"
        ? 2.0
        : 1.8;
  const protein = Math.round(currentWeightKg * proteinPerKg);
  const fatPct = plan.effectiveGoal === "gain" ? 0.25 : 0.28;
  const fat = Math.round((kcal * fatPct) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}
