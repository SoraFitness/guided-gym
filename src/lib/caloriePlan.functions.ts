import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import {
  clampWeeklyChangeKg,
  estimateMaintenance,
  formulaCaloriePlan,
  type CaloriePlanEstimate,
} from "./calorieEngine";
import { createOpenRouterProvider, OPENROUTER_COACH_MODEL } from "./openrouter.server";
import { claimRateLimit } from "./rateLimit.server";

const InputSchema = z.object({
  gender: z.enum(["male", "female", "other"]),
  age: z.number().int().min(14).max(100),
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(25).max(400),
  goalWeightKg: z.number().min(25).max(400),
  bodyFatPct: z.number().min(2).max(70).optional(),
  activity: z.enum(["sedentary", "light", "moderate", "very", "athlete"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.number().int().min(2).max(6),
  sessionMinutes: z.number().int().min(10).max(120),
  currentWorkoutsPerWeek: z.number().int().min(0).max(7).optional(),
});

export type CaloriePlanInput = z.infer<typeof InputSchema>;

const ModelSchema = z.object({
  maintenanceKcal: z.number(),
  weeklyChangeKg: z.number(),
  reason: z.string().min(1),
});

// The model refines the formula. It can't move maintenance further than this.
const MAX_AI_ADJUSTMENT = 0.1;

const SYSTEM_PROMPT = [
  "You are Ascendr's nutrition engine. Estimate a member's daily maintenance calories and the weekly weight change that best suits their goal.",
  "Start from formulaMaintenanceKcal (Mifflin-St Jeor times activity) and adjust it for training experience, current training frequency, session length and body fat if given.",
  "weeklyChangeKg is signed: negative to lose, positive to gain. Keep it between 0 and allowedWeeklyChangeKg.fastest, near allowedWeeklyChangeKg.suggested unless the member's details argue otherwise.",
  "reason is one short plain sentence to the member, under 20 words, saying why this pace suits them. No numbers, no medical claims.",
  'Respond with only a JSON object in exactly this shape: {"maintenanceKcal": 2500, "weeklyChangeKg": -0.45, "reason": "..."}. maintenanceKcal is a whole number. weeklyChangeKg has at most two decimals.',
].join(" ");

// This model writes its thinking into the reply unless told not to, and returns junk when
// given a strict JSON response format, so it's asked for plain JSON text and parsed here.
const NO_REASONING = { reasoning: { enabled: false } };

function parseModelJson(text: string) {
  return ModelSchema.parse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
}

export const estimateCaloriePlan = createServerFn({ method: "POST" })
  .validator(InputSchema)
  .handler(async ({ data }): Promise<CaloriePlanEstimate> => {
    const fallback = formulaCaloriePlan(data);
    try {
      claimRateLimit("calorie-plan", { limit: 12, windowMs: 15 * 60 * 1_000 });
      const { formulaKcal, maintenanceKcal } = estimateMaintenance(data);
      const provider = createOpenRouterProvider(undefined, "workout-plan");
      const { text } = await generateText({
        model: provider(OPENROUTER_COACH_MODEL),
        system: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 200,
        providerOptions: { openrouter: NO_REASONING, "ascendr-ai-gateway": NO_REASONING },
        prompt: JSON.stringify({
          member: data,
          formulaMaintenanceKcal: Math.round(formulaKcal),
          allowedWeeklyChangeKg: {
            fastest: Number(
              clampWeeklyChangeKg(
                data.goalWeightKg - data.currentWeightKg,
                data,
                maintenanceKcal,
              ).toFixed(2),
            ),
            suggested: Number(fallback.weeklyChangeKg.toFixed(2)),
          },
        }),
      });
      const output = parseModelJson(text);
      // Nothing from the model reaches a member unchecked: maintenance stays near the
      // formula and the pace stays inside the same safety limits as a manual choice.
      const factor = Math.min(
        1 + MAX_AI_ADJUSTMENT,
        Math.max(1 - MAX_AI_ADJUSTMENT, output.maintenanceKcal / formulaKcal),
      );
      if (!Number.isFinite(factor)) return fallback;
      return {
        source: "ai",
        maintenanceFactor: factor,
        weeklyChangeKg: clampWeeklyChangeKg(output.weeklyChangeKg, data, formulaKcal * factor),
        reason: output.reason.trim().slice(0, 160),
      };
    } catch (error) {
      console.warn("[calorie plan] AI estimate failed; using the formula", error);
      return fallback;
    }
  });
