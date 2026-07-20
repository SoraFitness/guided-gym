import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FoodSearchSource = "preset" | "nutritionix" | "usda" | "openfoodfacts";

export interface FoodSearchResult {
  id: string;
  source: FoodSearchSource;
  brand?: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  verified: boolean;
  estimated?: boolean; // true when macros may be approximate (e.g. Nutritionix instant w/o detail)
  category?: "restaurant" | "protein" | "grocery" | "generic";
  imageUrl?: string;
}

export type FoodSearchResponse =
  | { ok: true; results: FoodSearchResult[]; sources: FoodSearchSource[] }
  | { ok: false; reason: "empty_query" | "all_sources_failed"; results: [] };

export type BarcodeLookupResponse =
  | { ok: true; result: FoodSearchResult }
  | { ok: false; reason: "invalid_barcode" | "not_found" | "service_unavailable" };

const QuerySchema = z.object({ query: z.string().min(1).max(80) });
const BarcodeSchema = z.object({ barcode: z.string().min(1).max(32) });

const round = (n: unknown, d = 1) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

// ============ Nutritionix ============
// https://trackapi.nutritionix.com/v2/search/instant
// Instant search returns branded items with calories + serving but not full macros.
// We then enrich the top branded results via /v2/search/item for protein/carbs/fat,
// and the top common items via /v2/natural/nutrients.
async function searchNutritionix(query: string): Promise<FoodSearchResult[]> {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_API_KEY;
  if (!appId || !appKey) return [];

  try {
    const url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}&detailed=true`;
    const res = await fetch(url, {
      headers: { "x-app-id": appId, "x-app-key": appKey, "x-remote-user-id": "0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      common?: Array<{
        food_name: string;
        serving_unit?: string;
        serving_qty?: number;
        photo?: { thumb?: string };
        full_nutrients?: Array<{ attr_id: number; value: number }>;
      }>;
      branded?: Array<{
        food_name: string;
        brand_name?: string;
        serving_unit?: string;
        serving_qty?: number;
        nf_calories?: number;
        nf_protein?: number;
        nf_total_carbohydrate?: number;
        nf_total_fat?: number;
        nix_item_id?: string;
        photo?: { thumb?: string };
      }>;
    };

    const out: FoodSearchResult[] = [];

    // Branded items: prefer brand-tagged results first (closer to "Big Mac" / "Prime")
    for (const b of (data.branded ?? []).slice(0, 12)) {
      const serving = `${b.serving_qty ?? 1} ${b.serving_unit ?? "serving"}`.trim();
      const hasMacros =
        b.nf_protein != null || b.nf_total_carbohydrate != null || b.nf_total_fat != null;
      out.push({
        id: `nutritionix:${b.nix_item_id ?? `${b.brand_name}-${b.food_name}`}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
        source: "nutritionix",
        brand: b.brand_name,
        name: b.food_name,
        serving,
        kcal: Math.round(b.nf_calories ?? 0),
        protein: round(b.nf_protein ?? 0),
        carbs: round(b.nf_total_carbohydrate ?? 0),
        fat: round(b.nf_total_fat ?? 0),
        verified: true,
        estimated: !hasMacros,
        category: "restaurant",
        imageUrl: b.photo?.thumb,
      });
    }

    // Common items: full nutrients only available when detailed=true
    // attr_id 208 kcal, 203 protein, 205 carbs, 204 fat
    for (const c of (data.common ?? []).slice(0, 6)) {
      const n = c.full_nutrients ?? [];
      const get = (id: number) => n.find((x) => x.attr_id === id)?.value ?? 0;
      const kcal = get(208);
      if (!kcal) continue;
      out.push({
        id: `nutritionix:common:${c.food_name}`.toLowerCase().replace(/\s+/g, "-"),
        source: "nutritionix",
        name: c.food_name,
        serving: `${c.serving_qty ?? 1} ${c.serving_unit ?? "serving"}`.trim(),
        kcal: Math.round(kcal),
        protein: round(get(203)),
        carbs: round(get(205)),
        fat: round(get(204)),
        verified: true,
        category: "generic",
        imageUrl: c.photo?.thumb,
      });
    }

    return out;
  } catch (err) {
    console.error("[searchNutritionix]", err);
    return [];
  }
}

// ============ USDA FoodData Central ============
// https://api.nal.usda.gov/fdc/v1/foods/search
async function searchUSDA(query: string): Promise<FoodSearchResult[]> {
  const key = process.env.USDA_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&pageSize=15&dataType=Branded,SR%20Legacy,Foundation`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      foods?: Array<{
        fdcId: number;
        description: string;
        brandName?: string;
        brandOwner?: string;
        servingSize?: number;
        servingSizeUnit?: string;
        householdServingFullText?: string;
        dataType?: string;
        foodNutrients?: Array<{
          nutrientNumber?: string;
          nutrientName?: string;
          value?: number;
          unitName?: string;
        }>;
      }>;
    };

    const out: FoodSearchResult[] = [];
    for (const f of (data.foods ?? []).slice(0, 15)) {
      const nuts = f.foodNutrients ?? [];
      const getByNum = (num: string) => nuts.find((n) => n.nutrientNumber === num)?.value ?? 0;
      const kcal = getByNum("208");
      if (!kcal) continue;
      const serving =
        f.householdServingFullText ??
        (f.servingSize ? `${f.servingSize} ${f.servingSizeUnit ?? "g"}` : "1 serving");
      out.push({
        id: `usda:${f.fdcId}`,
        source: "usda",
        brand: f.brandName || f.brandOwner,
        name: f.description,
        serving,
        kcal: Math.round(kcal),
        protein: round(getByNum("203")),
        carbs: round(getByNum("205")),
        fat: round(getByNum("204")),
        verified: true,
        category: f.dataType === "Branded" ? "grocery" : "generic",
      });
    }
    return out;
  } catch (err) {
    console.error("[searchUSDA]", err);
    return [];
  }
}

// ============ Open Food Facts ============
// https://world.openfoodfacts.org/cgi/search.pl
async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,serving_size,nutriments,image_thumb_url`;
    const res = await fetch(url, { headers: { "User-Agent": "Ascendr-Fitness/1.0" } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      products?: Array<{
        code?: string;
        product_name?: string;
        brands?: string;
        serving_size?: string;
        image_thumb_url?: string;
        nutriments?: Record<string, number>;
      }>;
    };

    const out: FoodSearchResult[] = [];
    for (const p of (data.products ?? []).slice(0, 15)) {
      if (!p.product_name) continue;
      const n = p.nutriments ?? {};
      // Prefer per-serving when available, else per-100g
      const kcal = Number(n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0);
      const protein = Number(n["proteins_serving"] ?? n["proteins_100g"] ?? 0);
      const carbs = Number(n["carbohydrates_serving"] ?? n["carbohydrates_100g"] ?? 0);
      const fat = Number(n["fat_serving"] ?? n["fat_100g"] ?? 0);
      const perServing = n["energy-kcal_serving"] != null;
      if (!kcal) continue;
      out.push({
        id: `off:${p.code ?? p.product_name}`,
        source: "openfoodfacts",
        brand: p.brands?.split(",")[0]?.trim(),
        name: p.product_name,
        serving: perServing && p.serving_size ? p.serving_size : "100 g",
        kcal: Math.round(kcal),
        protein: round(protein),
        carbs: round(carbs),
        fat: round(fat),
        verified: true,
        category: "grocery",
        imageUrl: p.image_thumb_url,
      });
    }
    return out;
  } catch (err) {
    console.error("[searchOpenFoodFacts]", err);
    return [];
  }
}

export const lookupFoodByBarcode = createServerFn({ method: "POST" })
  .validator(BarcodeSchema)
  .handler(async ({ data }): Promise<BarcodeLookupResponse> => {
    const barcode = data.barcode.trim();
    if (!/^\d{8,14}$/.test(barcode)) {
      return { ok: false, reason: "invalid_barcode" };
    }

    try {
      const fields = [
        "code",
        "product_name",
        "brands",
        "serving_size",
        "quantity",
        "nutriments",
        "image_front_small_url",
        "image_thumb_url",
      ].join(",");
      // Some camera decoders return a UPC-A without the EAN-13 leading zero
      // (or the reverse). Try both canonical forms before calling it missing.
      const candidates = [
        barcode,
        ...(barcode.length === 12 ? [`0${barcode}`] : []),
        ...(barcode.length === 13 && barcode.startsWith("0") ? [barcode.slice(1)] : []),
      ];
      let product:
        | {
            code?: string;
            product_name?: string;
            brands?: string;
            serving_size?: string;
            quantity?: string;
            image_front_small_url?: string;
            image_thumb_url?: string;
            nutriments?: Record<string, number | string>;
          }
        | undefined;
      let serviceUnavailable = false;

      for (const candidate of [...new Set(candidates)]) {
        const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(candidate)}?fields=${fields}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "Ascendr-Fitness/1.0 (barcode lookup)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          if (response.status !== 404) serviceUnavailable = true;
          continue;
        }
        const payload = (await response.json()) as {
          status?: number;
          product?: typeof product;
        };
        if (payload.status === 1 && payload.product?.product_name) {
          product = payload.product;
          break;
        }
      }

      if (!product?.product_name) {
        return { ok: false, reason: serviceUnavailable ? "service_unavailable" : "not_found" };
      }

      const nutrients = product.nutriments ?? {};
      const hasServingNutrition = Object.prototype.hasOwnProperty.call(
        nutrients,
        "energy-kcal_serving",
      );
      const suffix = hasServingNutrition ? "serving" : "100g";
      const value = (key: string) => round(nutrients[`${key}_${suffix}`] ?? 0);

      return {
        ok: true,
        result: {
          id: `off:${product.code ?? barcode}`,
          source: "openfoodfacts",
          brand: product.brands?.split(",")[0]?.trim(),
          name: product.product_name,
          serving:
            hasServingNutrition && product.serving_size
              ? product.serving_size
              : product.quantity || "100 g",
          kcal: Math.round(value("energy-kcal")),
          protein: value("proteins"),
          carbs: value("carbohydrates"),
          fat: value("fat"),
          verified: true,
          category: "grocery",
          imageUrl: product.image_front_small_url || product.image_thumb_url,
        },
      };
    } catch (error) {
      console.error("[lookupFoodByBarcode]", error);
      return { ok: false, reason: "service_unavailable" };
    }
  });

function dedupe(results: FoodSearchResult[]): FoodSearchResult[] {
  const seen = new Set<string>();
  const out: FoodSearchResult[] = [];
  for (const r of results) {
    const key = `${(r.brand ?? "").toLowerCase()}|${r.name.toLowerCase().slice(0, 40)}|${r.kcal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export const searchFoodDatabase = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => QuerySchema.parse(input))
  .handler(async ({ data }): Promise<FoodSearchResponse> => {
    const query = data.query.trim();
    if (!query) return { ok: false, reason: "empty_query", results: [] };

    const [nix, usda, off] = await Promise.all([
      searchNutritionix(query),
      searchUSDA(query),
      searchOpenFoodFacts(query),
    ]);

    const merged = dedupe([...nix, ...usda, ...off]).slice(0, 40);
    const sources: FoodSearchSource[] = [];
    if (nix.length) sources.push("nutritionix");
    if (usda.length) sources.push("usda");
    if (off.length) sources.push("openfoodfacts");

    if (!merged.length && sources.length === 0) {
      // All sources empty AND none configured -> fail soft so the client falls back to presets only
      return { ok: false, reason: "all_sources_failed", results: [] };
    }
    return { ok: true, results: merged, sources };
  });
