import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { normalizeNutritionLabel, type NutritionLabelValues } from "@/lib/nutritionLabel";

const Input = z.object({
  image: z
    .string()
    .min(32)
    .max(11_000_000)
    .refine((value) => /^data:image\/(?:jpeg|png|webp);base64,/i.test(value), {
      message: "Use a JPEG, PNG, or WebP photo.",
    }),
});

const printedAmount = z.number().min(0).nullable();

const ReadingSchema = z.object({
  readable: z.boolean(),
  product_name: z.string().nullable(),
  serving: z.string().nullable(),
  calories: printedAmount,
  fat_g: printedAmount,
  saturated_fat_g: printedAmount,
  carbs_g: printedAmount,
  fiber_g: printedAmount,
  sugars_g: printedAmount,
  protein_g: printedAmount,
  sodium_mg: printedAmount,
});

export type NutritionLabelResponse =
  | { ok: true; result: NutritionLabelValues }
  | { ok: false; reason: "unreadable" | "rate_limited" | "error" };

const PROMPT = [
  "You are reading the Nutrition Facts table printed on a packaged food.",
  "Copy the values exactly as printed for one serving, using the serving the label declares",
  '(for example "Per 1 bar (37 g)"). If the table only lists values per 100 g or 100 mL,',
  'use those and set serving to "100 g" or "100 mL".',
  "",
  "Return the serving in English as printed, calories (kcal), total fat, saturated fat,",
  "total carbohydrate, fibre, total sugars and protein in grams, and sodium in milligrams.",
  "Bilingual labels (such as English/French) print each value once for both languages.",
  "Ignore % Daily Value columns and never return a percentage as an amount.",
  "If a value is not printed or you cannot read it with certainty, return null for it.",
  "Do not estimate, calculate, or recall values from memory.",
  "Set readable to false when the photo does not show a legible nutrition table.",
  "product_name is the product name visible on the package, or null if none is visible.",
].join("\n");

export const readNutritionLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<NutritionLabelResponse> => {
    try {
      claimRateLimit("nutrition-label", { limit: 20, windowMs: 60 * 60 * 1_000 });
    } catch {
      return { ok: false, reason: "rate_limited" };
    }

    try {
      const gateway = createOpenRouterProvider(context.accessToken, "food-scan");
      const { experimental_output: reading } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: ReadingSchema }),
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

      const result = normalizeNutritionLabel(reading);
      return result ? { ok: true, result } : { ok: false, reason: "unreadable" };
    } catch (error) {
      console.error("readNutritionLabel failed:", error);
      return { ok: false, reason: "error" };
    }
  });
