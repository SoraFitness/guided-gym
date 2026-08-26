// Mock food lookup services for barcode + image scanning
import type { Food } from "./foods";
import type { NutrientDetails } from "./nutritionQuality";

export interface LookupResult {
  name: string;
  brand?: string;
  imageUrl?: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number; // 0-1 for image
  nutrients?: NutrientDetails;
}

// A small mock barcode database — in production this would call OpenFoodFacts etc.
const barcodeDB: Record<string, LookupResult> = {
  "0123456789012": {
    name: "Greek Yogurt",
    brand: "Chobani",
    serving: "1 cup (170g)",
    kcal: 140,
    protein: 20,
    carbs: 9,
    fat: 2,
  },
  "0049000028911": {
    name: "Coca-Cola Classic",
    brand: "Coca-Cola",
    serving: "12 fl oz",
    kcal: 140,
    protein: 0,
    carbs: 39,
    fat: 0,
  },
  "0028400090000": {
    name: "Lay's Classic Chips",
    brand: "Lay's",
    serving: "1 oz (28g)",
    kcal: 160,
    protein: 2,
    carbs: 15,
    fat: 10,
  },
};

const fallbackBarcodeFoods: LookupResult[] = [
  {
    name: "Protein Bar",
    brand: "Quest",
    serving: "1 bar (60g)",
    kcal: 200,
    protein: 21,
    carbs: 22,
    fat: 8,
  },
  {
    name: "Almond Milk",
    brand: "Silk",
    serving: "1 cup (240ml)",
    kcal: 30,
    protein: 1,
    carbs: 1,
    fat: 2.5,
  },
  {
    name: "Whole Wheat Bread",
    brand: "Dave's",
    serving: "1 slice (45g)",
    kcal: 110,
    protein: 5,
    carbs: 22,
    fat: 1.5,
  },
  {
    name: "Peanut Butter",
    brand: "Jif Natural",
    serving: "2 tbsp (32g)",
    kcal: 190,
    protein: 7,
    carbs: 8,
    fat: 16,
  },
];

export const foodLookupService = {
  async lookupBarcode(barcode: string): Promise<LookupResult> {
    await new Promise((r) => setTimeout(r, 700));
    if (barcodeDB[barcode]) return barcodeDB[barcode];
    // Deterministic pick from fallback
    const i =
      barcode.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % fallbackBarcodeFoods.length;
    return fallbackBarcodeFoods[i];
  },
};

// AI food image scanning lives in src/lib/foodScan.functions.ts and runs
// against the Supabase AI gateway. No mock results.

export function resultToCustom(r: LookupResult, source: "manual" | "barcode" | "image") {
  return {
    name: r.name,
    brand: r.brand,
    imageUrl: r.imageUrl,
    serving: r.serving,
    kcal: Math.round(r.kcal),
    protein: Math.round(r.protein),
    carbs: Math.round(r.carbs),
    fat: Math.round(r.fat),
    source,
    nutrients: r.nutrients,
  };
}

export type { Food };
