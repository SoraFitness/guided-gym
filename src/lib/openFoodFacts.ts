import type { NutrientDetails } from "./nutritionQuality";

// Maps an Open Food Facts product to the values the food log stores. The data
// is crowd-sourced, so entries that look unreliable are flagged for a label check.

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  image_front_small_url?: string;
  image_thumb_url?: string;
  nutriments?: Record<string, number | string>;
}

export interface OpenFoodFactsFood {
  name: string;
  brand?: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  nutrients: NutrientDetails;
  /** The entry is incomplete or contradicts itself, so the package label should be checked. */
  needsLabelCheck: boolean;
}

type NutrientReader = (key: string) => number | undefined;

const KJ_PER_KCAL = 4.184;

function amount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function optionalRound(value: number | undefined) {
  return value === undefined ? undefined : round(value);
}

function energyKcal(read: NutrientReader) {
  const kcal = read("energy-kcal");
  if (kcal !== undefined) return kcal;
  const kj = read("energy-kj");
  return kj === undefined ? undefined : kj / KJ_PER_KCAL;
}

function nameTokens(name: string) {
  return new Set(
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

// Entries edited by different contributors sometimes describe two products,
// e.g. "Nutri-Grain Strawberry" beside "Peanut Butter Chocolate Protein Bar".
function namesConflict(name: string, otherName: string | undefined) {
  if (!otherName?.trim()) return false;
  const tokens = nameTokens(name);
  const otherTokens = nameTokens(otherName);
  const smaller = Math.min(tokens.size, otherTokens.size);
  if (!smaller) return false;
  const shared = [...tokens].filter((token) => otherTokens.has(token)).length;
  return shared / smaller < 0.34;
}

export function openFoodFactsToFood(product: OpenFoodFactsProduct): OpenFoodFactsFood | null {
  const name = product.product_name?.trim();
  if (!name) return null;

  const nutriments = product.nutriments ?? {};
  const perServing: NutrientReader = (key) => amount(nutriments[`${key}_serving`]);
  const per100g: NutrientReader = (key) => amount(nutriments[`${key}_100g`]);
  const servingGrams = amount(product.serving_quantity);
  const servingSize = product.serving_size?.trim();

  let read: NutrientReader = () => undefined;
  let serving = servingSize || "1 serving";
  if (energyKcal(perServing) !== undefined) {
    read = perServing;
  } else if (energyKcal(per100g) !== undefined && servingGrams) {
    // Scale per-100 g values to the serving printed on the package.
    read = (key) => {
      const value = per100g(key);
      return value === undefined ? undefined : (value * servingGrams) / 100;
    };
    serving = servingSize || `${round(servingGrams)} g`;
  } else if (energyKcal(per100g) !== undefined) {
    read = per100g;
    serving = "100 g";
  }

  const kcal = energyKcal(read);
  const protein = read("proteins");
  const carbs = read("carbohydrates");
  const fat = read("fat");
  const sodiumG = read("sodium");
  const macroKcal =
    protein !== undefined && carbs !== undefined && fat !== undefined
      ? protein * 4 + carbs * 4 + fat * 9
      : undefined;
  const energyMismatch =
    kcal !== undefined &&
    macroKcal !== undefined &&
    Math.abs(kcal - macroKcal) > Math.max(20, kcal * 0.2);

  return {
    name,
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    serving,
    kcal: kcal === undefined ? 0 : Math.round(kcal),
    protein: round(protein ?? 0),
    carbs: round(carbs ?? 0),
    fat: round(fat ?? 0),
    imageUrl: product.image_front_small_url || product.image_thumb_url || undefined,
    nutrients: {
      fiberG: optionalRound(read("fiber")),
      sugarsG: optionalRound(read("sugars")),
      saturatedFatG: optionalRound(read("saturated-fat")),
      sodiumMg: sodiumG === undefined ? undefined : Math.round(sodiumG * 1000),
      provenance: "verified",
    },
    needsLabelCheck:
      kcal === undefined ||
      macroKcal === undefined ||
      energyMismatch ||
      namesConflict(name, product.product_name_en),
  };
}
