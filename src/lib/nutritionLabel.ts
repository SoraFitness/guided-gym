import type { NutrientDetails } from "./nutritionQuality";

/** Values read from a Nutrition Facts table; null when not printed or not legible. */
export interface NutritionLabelReading {
  readable: boolean;
  product_name: string | null;
  serving: string | null;
  calories: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sugars_g: number | null;
  protein_g: number | null;
  sodium_mg: number | null;
}

export interface NutritionLabelValues {
  productName?: string;
  serving: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  nutrients: NutrientDetails;
  /** False when the printed calories are far from what the printed macros add up to. */
  consistent: boolean;
}

function amount(value: number | null) {
  return value === null || !Number.isFinite(value) || value < 0
    ? undefined
    : Math.round(value * 10) / 10;
}

export function normalizeNutritionLabel(
  reading: NutritionLabelReading,
): NutritionLabelValues | null {
  const calories = amount(reading.calories);
  const protein = amount(reading.protein_g);
  const carbs = amount(reading.carbs_g);
  const fat = amount(reading.fat_g);
  if (!reading.readable || calories === undefined) return null;
  if (protein === undefined && carbs === undefined && fat === undefined) return null;

  const macroKcal = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  const sodium = amount(reading.sodium_mg);
  return {
    productName: reading.product_name?.trim() || undefined,
    serving: reading.serving?.trim() || "1 serving",
    kcal: Math.round(calories),
    protein,
    carbs,
    fat,
    nutrients: {
      fiberG: amount(reading.fiber_g),
      sugarsG: amount(reading.sugars_g),
      saturatedFatG: amount(reading.saturated_fat_g),
      sodiumMg: sodium === undefined ? undefined : Math.round(sodium),
      provenance: "verified",
    },
    consistent: Math.abs(calories - macroKcal) <= Math.max(25, calories * 0.25),
  };
}
