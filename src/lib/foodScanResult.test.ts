import { describe, expect, it } from "vitest";
import { normalizeFoodScan, type RawFoodScanItem } from "./foodScanResult";

// A live reading of a Kellogg's Nutri-Grain Strawberry bar package photo.
const nutriGrain: RawFoodScanItem = {
  name: " Kellogg's Nutri-Grain Strawberry bar ",
  estimated_amount: "1 bar (37 g)",
  packaged: true,
  confidence: 0.95,
  calories: 136,
  protein: 1.7,
  carbs: 26,
  fat: 2.5,
  fiber: 1.1,
  sugars: 11,
  saturated_fat: 0.5,
  sodium: 70,
};

describe("food photo scan results", () => {
  it("keeps label-precision values for a confident packaged product", () => {
    const result = normalizeFoodScan({
      meal_name: "Kellogg's Nutri-Grain Strawberry bar",
      confidence: 0.95,
      items: [nutriGrain],
    });

    expect(result).toMatchObject({
      items: [
        {
          name: "Kellogg's Nutri-Grain Strawberry bar",
          packaged: true,
          calories: 136,
          protein: 1.7,
          carbs: 26,
          fat: 2.5,
        },
      ],
      total: { calories: 136, protein: 1.7, carbs: 26, fat: 2.5 },
      needs_user_confirmation: false,
    });
  });

  it("asks for confirmation when calories don't match the macros", () => {
    const result = normalizeFoodScan({
      meal_name: "Snack bar",
      confidence: 0.95,
      items: [{ ...nutriGrain, protein: 0, carbs: 0, fat: 0 }],
    });

    expect(result?.items[0].confidence).toBeLessThanOrEqual(0.5);
    expect(result?.needs_user_confirmation).toBe(true);
  });

  it("totals a plate and cleans up odd model values", () => {
    const result = normalizeFoodScan({
      meal_name: "",
      confidence: 88,
      items: [
        {
          ...nutriGrain,
          name: "Rice",
          packaged: false,
          calories: 205.4,
          protein: 4.26,
          carbs: 44.5,
          fat: 0.44,
        },
        {
          ...nutriGrain,
          name: "Chicken breast",
          packaged: false,
          calories: 165,
          protein: 31,
          carbs: -2,
          fat: 3.6,
        },
        { ...nutriGrain, name: "   " },
      ],
    });

    expect(result?.confidence).toBe(0.88);
    expect(result?.meal_name).toBe("Rice");
    expect(result?.items.map((item) => item.name)).toEqual(["Rice", "Chicken breast"]);
    expect(result?.items[1].carbs).toBe(0);
    expect(result?.total).toEqual({ calories: 370, protein: 35.3, carbs: 44.5, fat: 4 });
  });

  it("reports photos without food", () => {
    expect(normalizeFoodScan({ meal_name: "Carpet", confidence: 0.9, items: [] })).toBeNull();
  });
});
