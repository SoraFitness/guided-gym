import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";

const Input = z.object({
  image: z
    .string()
    .min(32)
    .max(11_000_000)
    .refine((value) => /^data:image\/(?:jpeg|png|webp);base64,/i.test(value), {
      message: "Use a JPEG, PNG, or WebP photo.",
    }),
});

const Item = z.object({
  name: z.string(),
  estimated_amount: z.string(),
  confidence: z.number().min(0).max(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0),
  sugars: z.number().min(0),
  saturated_fat: z.number().min(0),
  sodium: z.number().min(0),
});

const ResultSchema = z.object({
  meal_name: z.string(),
  confidence: z.number().min(0).max(1),
  items: z.array(Item).min(1).max(12),
  notes: z.string().optional(),
});

export interface FoodScanItem {
  name: string;
  estimated_amount: string;
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
export type FoodScanResponse =
  | { ok: true; result: FoodScanResult }
  | { ok: false; reason: "no_key" | "unrecognized" | "error"; message?: string };

const PROMPT = [
  "You are a nutrition assistant analyzing a single photo of a meal.",
  "Identify each distinct food item visible on the plate / in the image.",
  "For each item: give a concise common name, a realistic estimated portion",
  "(grams, cups, pieces, slices, oz — whatever is most natural), and",
  "nutrition values that match standard USDA / common nutrition database",
  "entries for that portion. Include calories, protein, carbs, fat, fibre, total sugars,",
  "saturated fat, and sodium in milligrams. Round estimates to practical label-style values.",
  "",
  "Confidence rules:",
  "- Per-item confidence reflects how certain you are about identity AND portion.",
  "- Overall meal confidence is the average, weighted toward the largest items.",
  "- If any item is below 0.7 confidence, flag the meal as needing confirmation.",
  "- Never fabricate exact numbers you can't justify — if unsure, lower confidence.",
  "",
  "Output a short descriptive meal_name (e.g. 'Chicken rice bowl').",
  "Cap items at 12. No commentary, only the structured fields.",
].join("\n");

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<FoodScanResponse> => {
    claimRateLimit("food-photo", { limit: 10, windowMs: 60 * 60 * 1_000 });

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
              { type: "image_url", image_url: { url: data.image } },
            ] as never,
          },
        ],
      });

      const items: FoodScanItem[] = output.items.slice(0, 12).map((i) => ({
        name: i.name.trim(),
        estimated_amount: i.estimated_amount.trim(),
        confidence: Math.max(0, Math.min(1, i.confidence)),
        calories: Math.max(0, Math.round(i.calories)),
        protein: Math.max(0, Math.round(i.protein)),
        carbs: Math.max(0, Math.round(i.carbs)),
        fat: Math.max(0, Math.round(i.fat)),
        fiber: Math.max(0, Math.round(i.fiber * 10) / 10),
        sugars: Math.max(0, Math.round(i.sugars * 10) / 10),
        saturated_fat: Math.max(0, Math.round(i.saturated_fat * 10) / 10),
        sodium: Math.max(0, Math.round(i.sodium)),
      }));

      if (items.length === 0) return { ok: false, reason: "unrecognized" };

      const total = items.reduce(
        (a, i) => ({
          calories: a.calories + i.calories,
          protein: a.protein + i.protein,
          carbs: a.carbs + i.carbs,
          fat: a.fat + i.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      const minConf = Math.min(...items.map((i) => i.confidence));
      const needs_user_confirmation = output.confidence < 0.7 || minConf < 0.7;

      return {
        ok: true,
        result: {
          meal_name: output.meal_name.trim() || "Detected meal",
          confidence: Math.max(0, Math.min(1, output.confidence)),
          items,
          total,
          needs_user_confirmation,
          notes: output.notes?.trim() || undefined,
        },
      };
    } catch (err) {
      console.error("analyzeFoodImage failed:", err);
      return { ok: false, reason: "unrecognized", message: (err as Error).message };
    }
  });
