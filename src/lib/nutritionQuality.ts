import { entryFood, meals, type LogEntry, type Meal } from "./foods";

export interface NutrientDetails {
  fiberG?: number;
  sugarsG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  provenance?: "verified" | "estimated" | "manual" | "unknown";
}

export type NutritionQualityBand =
  | "Excellent"
  | "Strong"
  | "Balanced"
  | "Needs balance"
  | "Unrated";
export type NutritionQualityConfidence = "verified" | "estimated" | "partial";

export interface NutritionQuality {
  score: number | null;
  band: NutritionQualityBand;
  confidence: NutritionQualityConfidence;
  positives: string[];
  watchItems: string[];
  dimensions: {
    protein?: number;
    fiber?: number;
    sugars?: number;
    saturatedFat?: number;
    sodium?: number;
  };
}

export interface QualityInput {
  kcal: number;
  protein: number;
  proteinGoal: number;
  meal: Meal;
  nutrients?: NutrientDetails;
  tags?: string[];
}

const DAILY_VALUES = {
  fiberG: 28,
  sugarsG: 100,
  saturatedFatG: 20,
  sodiumMg: 2300,
} as const;

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const safe = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

function limitDimension(value: number, dailyValue: number) {
  const percentDv = (value / dailyValue) * 100;
  if (percentDv <= 5) return 100;
  if (percentDv >= 15) return 0;
  return Math.round(100 - ((percentDv - 5) / 10) * 100);
}

function bandFor(score: number | null): NutritionQualityBand {
  if (score === null) return "Unrated";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Balanced";
  return "Needs balance";
}

export function scoreNutritionQuality({
  protein,
  proteinGoal,
  meal,
  nutrients,
  tags = [],
}: QualityInput): NutritionQuality {
  const mealShare = meal === "Snack" ? 0.1 : 0.25;
  const proteinTarget = Math.max(1, proteinGoal * mealShare);
  const dimensions: NutritionQuality["dimensions"] = {
    protein: Math.round(clamp((Math.max(0, protein) / proteinTarget) * 100)),
  };
  const fiber = safe(nutrients?.fiberG);
  const sugars = safe(nutrients?.sugarsG);
  const saturatedFat = safe(nutrients?.saturatedFatG);
  const sodium = safe(nutrients?.sodiumMg);

  if (fiber !== undefined) {
    const percentDv = (fiber / DAILY_VALUES.fiberG) * 100;
    dimensions.fiber = Math.round(clamp((percentDv / 15) * 100));
  }
  if (sugars !== undefined) dimensions.sugars = limitDimension(sugars, DAILY_VALUES.sugarsG);
  if (saturatedFat !== undefined)
    dimensions.saturatedFat = limitDimension(saturatedFat, DAILY_VALUES.saturatedFatG);
  if (sodium !== undefined) dimensions.sodium = limitDimension(sodium, DAILY_VALUES.sodiumMg);

  const values = Object.values(dimensions).filter((value): value is number => value !== undefined);
  const score = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const positives: string[] = [];
  const watchItems: string[] = [];
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  if ((dimensions.sugars ?? 100) <= 45) watchItems.push("Sugars are high for one serving");
  if ((dimensions.saturatedFat ?? 100) <= 45)
    watchItems.push("Saturated fat is high for one serving");
  if ((dimensions.sodium ?? 100) <= 45) watchItems.push("Sodium is high for one serving");
  if ((dimensions.protein ?? 0) >= 75) positives.push("Protein supports your target");
  else if ((dimensions.protein ?? 100) < 50) watchItems.push("Add a stronger protein source");
  if ((dimensions.fiber ?? 0) >= 65) positives.push("Good fibre contribution");
  else if (dimensions.fiber !== undefined && dimensions.fiber < 35)
    watchItems.push("Fibre is low for this meal");
  if (["fruit", "veg", "whole-grain", "plant-protein"].some((tag) => tagSet.has(tag)))
    positives.push("Includes a nutrient-dense whole-food choice");

  const nutrientDimensionCount = [fiber, sugars, saturatedFat, sodium].filter(
    (value) => value !== undefined,
  ).length;
  const confidence: NutritionQualityConfidence =
    nutrients?.provenance === "estimated"
      ? "estimated"
      : nutrientDimensionCount === 4 && nutrients?.provenance === "verified"
        ? "verified"
        : "partial";

  return {
    score,
    band: bandFor(score),
    confidence,
    positives: [...new Set(positives)].slice(0, 3),
    watchItems: [...new Set(watchItems)].slice(0, 3),
    dimensions,
  };
}

function sumNutrient(entries: LogEntry[], key: keyof Omit<NutrientDetails, "provenance">) {
  if (!entries.length) return undefined;
  let total = 0;
  for (const entry of entries) {
    const value = safe(entryFood(entry).nutrients?.[key]);
    if (value === undefined) return undefined;
    total += value * entry.servings;
  }
  return Math.round(total * 10) / 10;
}

export function scoreLogEntries(entries: LogEntry[], proteinGoal: number) {
  const byMeal = Object.fromEntries(
    meals.map((meal) => {
      const mealEntries = entries.filter((entry) => entry.meal === meal);
      if (!mealEntries.length) return [meal, null];
      const foods = mealEntries.map((entry) => ({ entry, food: entryFood(entry) }));
      const provenance = foods.some(({ food }) => food.nutrients?.provenance === "estimated")
        ? "estimated"
        : foods.every(({ food }) => food.nutrients?.provenance === "verified")
          ? "verified"
          : "unknown";
      const totals = foods.reduce(
        (acc, { entry, food }) => {
          acc.kcal += food.kcal * entry.servings;
          acc.protein += food.protein * entry.servings;
          return acc;
        },
        { kcal: 0, protein: 0 },
      );
      return [
        meal,
        {
          kcal: totals.kcal,
          quality: scoreNutritionQuality({
            ...totals,
            proteinGoal,
            meal,
            nutrients: {
              fiberG: sumNutrient(mealEntries, "fiberG"),
              sugarsG: sumNutrient(mealEntries, "sugarsG"),
              saturatedFatG: sumNutrient(mealEntries, "saturatedFatG"),
              sodiumMg: sumNutrient(mealEntries, "sodiumMg"),
              provenance,
            },
            tags: foods.flatMap(({ food }) => food.tags ?? []),
          }),
        },
      ];
    }),
  ) as Record<Meal, { kcal: number; quality: NutritionQuality } | null>;

  const scoredMeals = meals
    .map((meal) => byMeal[meal])
    .filter(
      (item): item is { kcal: number; quality: NutritionQuality } => item?.quality.score != null,
    );
  if (!scoredMeals.length) {
    return {
      meals: byMeal,
      day: {
        score: null,
        band: "Unrated",
        confidence: "partial",
        positives: [],
        watchItems: [],
        dimensions: {},
      } satisfies NutritionQuality,
    };
  }
  const weight = scoredMeals.reduce((sum, item) => sum + Math.max(1, item.kcal), 0);
  const dayScore = Math.round(
    scoredMeals.reduce(
      (sum, item) => sum + (item.quality.score as number) * Math.max(1, item.kcal),
      0,
    ) / weight,
  );
  const confidence: NutritionQualityConfidence = scoredMeals.every(
    (item) => item.quality.confidence === "verified",
  )
    ? "verified"
    : scoredMeals.some((item) => item.quality.confidence === "estimated")
      ? "estimated"
      : "partial";

  return {
    meals: byMeal,
    day: {
      score: dayScore,
      band: bandFor(dayScore),
      confidence,
      positives: [...new Set(scoredMeals.flatMap((item) => item.quality.positives))].slice(0, 3),
      watchItems: [...new Set(scoredMeals.flatMap((item) => item.quality.watchItems))].slice(0, 3),
      dimensions: {},
    } satisfies NutritionQuality,
  };
}
