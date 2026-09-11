import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { normalizeFoodScan, type FoodScanResult } from "@/lib/foodScanResult";

export type { FoodScanItem, FoodScanResult } from "@/lib/foodScanResult";

const Input = z.object({
  image: z
    .string()
    .min(32)
    .max(11_000_000)
    .refine((value) => /^data:image\/(?:jpeg|png|webp);base64,/i.test(value), {
      message: "Use a JPEG, PNG, or WebP photo.",
    }),
});

// Numbers are cleaned up in normalizeFoodScan so one odd value (for example
// confidence written as 90 instead of 0.9) does not throw away a good scan.
const Item = z.object({
  name: z.string(),
  estimated_amount: z.string(),
  packaged: z.boolean(),
  confidence: z.number(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  sugars: z.number(),
  saturated_fat: z.number(),
  sodium: z.number(),
});

const ResultSchema = z.object({
  meal_name: z.string(),
  confidence: z.number(),
  items: z.array(Item).max(12),
  notes: z.string().optional(),
});

export type FoodScanResponse =
  | { ok: true; result: FoodScanResult }
  | {
      ok: false;
      reason: "no_key" | "unrecognized" | "no_food" | "rate_limited" | "error";
      message?: string;
    };

const PROMPT = [
  "You are a nutrition assistant analyzing one food photo.",
  "Identify each distinct food or drink that is visible, whether it is a plated meal or a packaged product.",
  "",
  "Packaged products:",
  "- Set packaged to true.",
  '- Read the brand, product, and flavour printed on the package and use them as the name (for example "Kellogg\'s Nutri-Grain Strawberry bar").',
  '- Use the product\'s published nutrition facts for the visible unit (one bar, one can, one bag), and put the unit and its weight in estimated_amount (for example "1 bar (37 g)").',
  "- If a Nutrition Facts table is visible and legible, copy its values exactly. When the visible side only shows some values, fill in the rest from the product's published nutrition facts.",
  "",
  "Unpackaged food:",
  "- Set packaged to false.",
  "- Give a concise common name and a realistic portion (grams, cups, pieces, slices, or oz).",
  "- Use standard USDA or common nutrition database values for that portion.",
  "",
  "For every item give calories in kcal; protein, carbs, fat, fiber, total sugars, and saturated fat in grams; and sodium in milligrams.",
  "Only use 0 for a nutrient the food genuinely lacks (for example protein in cola). Calories should roughly equal 4 × protein + 4 × carbs + 9 × fat.",
  "confidence is a number from 0 to 1 covering both identity and portion. The overall confidence is the average, weighted toward the largest items.",
  "Never invent food that is not visible. If the photo shows no food or drink, return an empty items array.",
  "",
  "Return JSON with meal_name, confidence, optional notes, and items. Each item has name, estimated_amount, packaged, confidence, calories, protein, carbs, fat, fiber, sugars, saturated_fat, and sodium.",
  "meal_name is short and descriptive (for example 'Chicken rice bowl', or the product name). Cap items at 12.",
].join("\n");

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<FoodScanResponse> => {
    try {
      claimRateLimit("food-photo", { limit: 20, windowMs: 60 * 60 * 1_000 });
    } catch {
      return { ok: false, reason: "rate_limited" };
    }

    try {
      const gateway = createOpenRouterProvider(context.accessToken, "food-scan");

      const { experimental_output: output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: ResultSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image", image: data.image },
            ],
          },
        ],
      });

      const result = normalizeFoodScan(output);
      return result ? { ok: true, result } : { ok: false, reason: "no_food" };
    } catch (err) {
      console.error("analyzeFoodImage failed:", err);
      return { ok: false, reason: "error", message: (err as Error).message };
    }
  });
