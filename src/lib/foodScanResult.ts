// Cleans a vision model's reading of a food photo into the values the food log stores.

export interface RawFoodScanItem {
  name: string;
  estimated_amount: string;
  packaged: boolean;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  saturated_fat: number;
  sodium: number;
}

export interface RawFoodScan {
  meal_name: string;
  confidence: number;
  items: RawFoodScanItem[];
  notes?: string;
}

export interface FoodScanItem {
  name: string;
  estimated_amount: string;
  /** A branded, packaged product whose label gives exact values. */
  packaged: boolean;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  saturated_fat: number;
  sodium: number;
}

export interface FoodScanResult {
  meal_name: string;
  confidence: number;
  items: FoodScanItem[];
  total: { calories: number; protein: number; carbs: number; fat: number };
  needs_user_confirmation: boolean;
  notes?: string;
}

const grams = (value: number) => Math.max(0, Math.round(value * 10) / 10);
// Models occasionally answer 95 instead of 0.95.
const unitInterval = (value: number) => Math.max(0, Math.min(1, value > 1 ? value / 100 : value));

/** Returns null when the photo contains no food or drink. */
export function normalizeFoodScan(raw: RawFoodScan): FoodScanResult | null {
  const items: FoodScanItem[] = raw.items
    .filter((item) => item.name.trim())
    .slice(0, 12)
    .map((item) => {
      const next: FoodScanItem = {
        name: item.name.trim(),
        estimated_amount: item.estimated_amount.trim() || "1 serving",
        packaged: item.packaged,
        confidence: unitInterval(item.confidence),
        calories: Math.max(0, Math.round(item.calories)),
        protein: grams(item.protein),
        carbs: grams(item.carbs),
        fat: grams(item.fat),
        fiber: grams(item.fiber),
        sugars: grams(item.sugars),
        saturated_fat: grams(item.saturated_fat),
        sodium: Math.max(0, Math.round(item.sodium)),
      };
      // Calories far above what the macros add up to means the macros were guessed
      // or left blank, so the member is asked to confirm before saving.
      const macroKcal = next.protein * 4 + next.carbs * 4 + next.fat * 9;
      if (next.calories > 40 && macroKcal < next.calories * 0.6) {
        next.confidence = Math.min(next.confidence, 0.5);
      }
      return next;
    });

  if (items.length === 0) return null;

  const sum = (key: "calories" | "protein" | "carbs" | "fat") =>
    items.reduce((total, item) => total + item[key], 0);
  const confidence = unitInterval(raw.confidence);
  const lowestItemConfidence = Math.min(...items.map((item) => item.confidence));

  return {
    meal_name: raw.meal_name.trim() || items[0].name,
    confidence,
    items,
    total: {
      calories: Math.round(sum("calories")),
      protein: grams(sum("protein")),
      carbs: grams(sum("carbs")),
      fat: grams(sum("fat")),
    },
    needs_user_confirmation: confidence < 0.7 || lowestItemConfidence < 0.7,
    notes: raw.notes?.trim() || undefined,
  };
}
