import { describe, expect, it } from "vitest";
import { openFoodFactsToFood } from "./openFoodFacts";

// Trimmed from the live Open Food Facts record for barcode 0064100281455.
const nutriGrain = {
  code: "0064100281455",
  product_name: "Kellogg's Nutri-grain Cereal Bar - Strawberry",
  product_name_en: "Peanut Butter Chocolate Plant Protein Bar",
  brands: "Nutri-Grain",
  serving_size: "1 serving (37 g)",
  serving_quantity: 37,
  nutriments: {
    "energy-kcal_serving": 142,
    "energy-kcal_100g": 383.333333333333,
    fat_serving: 3.5,
    "saturated-fat_serving": 0.5,
    carbohydrates_serving: 26,
    fiber_serving: 2,
    sugars_serving: 13,
    proteins_serving: 2,
    sodium_serving: 0.297,
    fat_100g: 9.45945945945946,
    carbohydrates_100g: 70.2702702702703,
    proteins_100g: 5.40540540540541,
  },
};

describe("Open Food Facts barcode results", () => {
  it("keeps per-serving values at label precision", () => {
    expect(openFoodFactsToFood(nutriGrain)).toMatchObject({
      serving: "1 serving (37 g)",
      kcal: 142,
      protein: 2,
      carbs: 26,
      fat: 3.5,
      nutrients: { fiberG: 2, sugarsG: 13, saturatedFatG: 0.5, sodiumMg: 297 },
    });
  });

  it("flags an entry whose names describe different products", () => {
    expect(openFoodFactsToFood(nutriGrain)?.needsLabelCheck).toBe(true);
    expect(
      openFoodFactsToFood({ ...nutriGrain, product_name_en: "Nutri-Grain Strawberry Cereal Bar" })
        ?.needsLabelCheck,
    ).toBe(false);
  });

  it("flags calories that disagree with the macros", () => {
    const food = openFoodFactsToFood({
      ...nutriGrain,
      product_name_en: undefined,
      nutriments: { ...nutriGrain.nutriments, "energy-kcal_serving": 300 },
    });
    expect(food?.needsLabelCheck).toBe(true);
  });

  it("scales per-100 g values to the declared serving", () => {
    const food = openFoodFactsToFood({
      product_name: "Granola",
      serving_size: "40 g",
      serving_quantity: 40,
      nutriments: {
        "energy-kcal_100g": 400,
        proteins_100g: 10,
        carbohydrates_100g: 60,
        fat_100g: 12.5,
      },
    });
    expect(food).toMatchObject({ serving: "40 g", kcal: 160, protein: 4, carbs: 24, fat: 5 });
  });

  it("labels per-100 g values as 100 g instead of the package size", () => {
    const food = openFoodFactsToFood({
      product_name: "Crackers",
      nutriments: {
        "energy-kj_100g": 1966,
        proteins_100g: 9,
        carbohydrates_100g: 68,
        fat_100g: 17,
      },
    });
    expect(food).toMatchObject({ serving: "100 g", kcal: 470, needsLabelCheck: false });
  });
});
