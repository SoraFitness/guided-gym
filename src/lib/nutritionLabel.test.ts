import { describe, expect, it } from "vitest";
import { normalizeNutritionLabel, type NutritionLabelReading } from "./nutritionLabel";

// The Nutri-Grain Apple Cinnamon bar label: per 1 bar (37 g).
const nutriGrainLabel: NutritionLabelReading = {
  readable: true,
  product_name: null,
  serving: "1 bar (37 g)",
  calories: 130,
  fat_g: 3.5,
  saturated_fat_g: 0.5,
  carbs_g: 26,
  fiber_g: 2,
  sugars_g: 13,
  protein_g: 2,
  sodium_mg: 135,
};

describe("nutrition label readings", () => {
  it("uses the values printed on the label", () => {
    expect(normalizeNutritionLabel(nutriGrainLabel)).toEqual({
      serving: "1 bar (37 g)",
      kcal: 130,
      protein: 2,
      carbs: 26,
      fat: 3.5,
      nutrients: {
        fiberG: 2,
        sugarsG: 13,
        saturatedFatG: 0.5,
        sodiumMg: 135,
        provenance: "verified",
      },
      consistent: true,
    });
  });

  it("rejects photos without a legible nutrition table", () => {
    expect(normalizeNutritionLabel({ ...nutriGrainLabel, readable: false })).toBeNull();
    expect(normalizeNutritionLabel({ ...nutriGrainLabel, calories: null })).toBeNull();
    expect(
      normalizeNutritionLabel({ ...nutriGrainLabel, protein_g: null, carbs_g: null, fat_g: null }),
    ).toBeNull();
  });

  it("marks calories that don't fit the macros for a double-check", () => {
    expect(normalizeNutritionLabel({ ...nutriGrainLabel, calories: 1300 })?.consistent).toBe(false);
  });
});
