// Mock food lookup services for barcode + image scanning
import type { Food } from "./foods";

export interface LookupResult {
  name: string;
  brand?: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number; // 0-1 for image
}

// A small mock barcode database — in production this would call OpenFoodFacts etc.
const barcodeDB: Record<string, LookupResult> = {
  "0123456789012": { name: "Greek Yogurt", brand: "Chobani", serving: "1 cup (170g)", kcal: 140, protein: 20, carbs: 9, fat: 2 },
  "0049000028911": { name: "Coca-Cola Classic", brand: "Coca-Cola", serving: "12 fl oz", kcal: 140, protein: 0, carbs: 39, fat: 0 },
  "0028400090000": { name: "Lay's Classic Chips", brand: "Lay's", serving: "1 oz (28g)", kcal: 160, protein: 2, carbs: 15, fat: 10 },
};

const fallbackBarcodeFoods: LookupResult[] = [
  { name: "Protein Bar", brand: "Quest", serving: "1 bar (60g)", kcal: 200, protein: 21, carbs: 22, fat: 8 },
  { name: "Almond Milk", brand: "Silk", serving: "1 cup (240ml)", kcal: 30, protein: 1, carbs: 1, fat: 2.5 },
  { name: "Whole Wheat Bread", brand: "Dave's", serving: "1 slice (45g)", kcal: 110, protein: 5, carbs: 22, fat: 1.5 },
  { name: "Peanut Butter", brand: "Jif Natural", serving: "2 tbsp (32g)", kcal: 190, protein: 7, carbs: 8, fat: 16 },
];

export const foodLookupService = {
  async lookupBarcode(barcode: string): Promise<LookupResult> {
    await new Promise((r) => setTimeout(r, 700));
    if (barcodeDB[barcode]) return barcodeDB[barcode];
    // Deterministic pick from fallback
    const i = barcode.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % fallbackBarcodeFoods.length;
    return fallbackBarcodeFoods[i];
  },
};

const mockImageMeals: LookupResult[] = [
  { name: "Chicken Rice Bowl", serving: "1 bowl (~480g)", kcal: 640, protein: 48, carbs: 72, fat: 18, confidence: 0.86 },
  { name: "Avocado Toast", serving: "2 slices", kcal: 380, protein: 12, carbs: 38, fat: 22, confidence: 0.81 },
  { name: "Garden Salad w/ Salmon", serving: "1 plate (~400g)", kcal: 520, protein: 36, carbs: 18, fat: 32, confidence: 0.78 },
  { name: "Pasta Bolognese", serving: "1 plate (~350g)", kcal: 590, protein: 28, carbs: 78, fat: 16, confidence: 0.83 },
  { name: "Veggie Burrito", serving: "1 burrito", kcal: 610, protein: 22, carbs: 86, fat: 18, confidence: 0.74 },
];

export const aiFoodScanService = {
  async analyzeImage(_file: File | Blob): Promise<LookupResult> {
    await new Promise((r) => setTimeout(r, 1800));
    return mockImageMeals[Math.floor(Math.random() * mockImageMeals.length)];
  },
};

export function resultToCustom(r: LookupResult, source: "manual" | "barcode" | "image") {
  return {
    name: r.name,
    brand: r.brand,
    serving: r.serving,
    kcal: Math.round(r.kcal),
    protein: Math.round(r.protein),
    carbs: Math.round(r.carbs),
    fat: Math.round(r.fat),
    source,
  };
}

export type { Food };
