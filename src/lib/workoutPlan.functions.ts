import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createOpenRouterProvider, OPENROUTER_COACH_MODEL } from "./openrouter.server";
import { claimRateLimit } from "./rateLimit.server";
import { splitLabelForWorkout } from "./weeklySchedule";
import type { SavedWorkoutPlan, WorkoutPlanInput } from "./workoutPlanStore";
import { buildProgramCandidates, fallbackProgram, orderProgramSessions } from "./workoutProgram";

const FocusSchema = z.enum([
  "chest",
  "back",
  "legs",
  "glutes",
  "arms",
  "core",
  "cardio",
  "mobility",
]);
const GoalSchema = z.enum([
  "lose_weight",
  "build_muscle",
  "recomp",
  "endurance",
  "maintain",
  "get_stronger",
  "overall",
]);
const InputSchema = z.object({
  goal: GoalSchema,
  goals: z.array(GoalSchema).min(1).max(7).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  currentWorkoutsPerWeek: z.number().int().min(0).max(7).optional(),
  equipment: z.enum(["none", "dumbbells", "gym", "mixed"]),
  focusAreas: z.array(FocusSchema).min(1).max(5),
  daysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  sessionMinutes: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  workoutSplit: z
    .enum([
      "auto",
      "full_body",
      "upper_lower",
      "push_pull_legs",
      "ppl_upper_lower",
      "phul",
      "arnold",
      "body_part",
    ])
    .optional(),
  notes: z.string().trim().max(300).optional(),
});

const ModelPlanSchema = z.object({
  name: z.string().min(3).max(50),
  summary: z.string().min(20).max(240),
  workoutIds: z.array(z.string()).min(2).max(6),
});

export interface WorkoutPlanGenerationResult {
  plan: SavedWorkoutPlan;
}

const SYSTEM_PROMPT = [
  "You are Ascendr's fitness programming engine. Build the member's weekly training program using only the provided candidate workout IDs.",
  "Return workoutIds as the ordered training sessions for one week: exactly request.daysPerWeek entries, session one first. Rest days are added automatically, so never include recovery or mobility sessions.",
  "A workout may repeat on non-consecutive sessions. Never schedule sessions that train the same primary muscles back to back.",
  "When workoutSplit is 'auto' or omitted, choose the structure (for example full body, upper/lower, or push/pull/legs) that best fits the member's days per week, goals, experience, current training frequency, equipment, session length, limitations, and focus areas. Follow an explicit workoutSplit when one is provided.",
  "request.notes holds the member's injuries and limitations in their own words. Read each candidate's exercises against them and leave out any session that would aggravate a limitation, repeating a safe session instead when needed.",
  "name is a short plan title under 40 characters. summary is one or two plain sentences to the member, under 200 characters, saying why this week suits their goals, schedule and equipment.",
  "Do not make medical claims, and never promise that a plan is safe for an injury.",
  'Respond with only a JSON object in exactly this shape: {"name": "...", "summary": "...", "workoutIds": ["..."]}.',
].join(" ");

// This model writes its thinking into the reply unless told not to, and returns junk when
// given a strict JSON response format, so it's asked for plain JSON text and parsed here.
const NO_REASONING = { reasoning: { enabled: false } };

function parseModelPlan(text: string) {
  return ModelPlanSchema.parse(
    JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)),
  );
}

export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .validator(InputSchema)
  .handler(async ({ data }): Promise<WorkoutPlanGenerationResult> => {
    claimRateLimit("workout-plan", { limit: 12, windowMs: 15 * 60 * 1_000 });
    const input = data as WorkoutPlanInput;
    const candidates = buildProgramCandidates(input);
    let generated = fallbackProgram(input, candidates);
    let source: SavedWorkoutPlan["source"] = "smart";
    if (candidates.length >= 2) {
      try {
        const provider = createOpenRouterProvider(undefined, "workout-plan");
        const candidateData = candidates.map(({ workout }) => ({
          id: workout.id,
          title: workout.title,
          sessionType: splitLabelForWorkout(workout),
          category: workout.category,
          duration: workout.duration,
          difficulty: workout.difficulty,
          muscles: workout.targetMuscles,
          exercises: workout.exercises.map((exercise) => exercise.name),
        }));
        const { text } = await generateText({
          model: provider(OPENROUTER_COACH_MODEL),
          system: SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 500,
          providerOptions: { openrouter: NO_REASONING, "ascendr-ai-gateway": NO_REASONING },
          prompt: JSON.stringify({ request: input, candidates: candidateData }),
        });
        const output = parseModelPlan(text);
        const allowed = new Set(candidateData.map((candidate) => candidate.id));
        const sessions = output.workoutIds
          .filter((id) => allowed.has(id))
          .slice(0, input.daysPerWeek);
        if (sessions.length === input.daysPerWeek) {
          // Told not to, the model still wrote "Knee-Safe" and "avoids spinal loading" when
          // given injury notes, so members with notes keep the plain wording.
          const wording = input.notes?.trim() ? generated : output;
          generated = {
            name: wording.name,
            summary: wording.summary,
            workoutIds: orderProgramSessions(sessions),
          };
          source = "ai";
        }
      } catch (error) {
        console.warn("[workout plan] AI generation failed; using ranked plan", error);
      }
    }

    return {
      plan: {
        id: crypto.randomUUID(),
        name: generated.name,
        summary: generated.summary,
        createdAt: new Date().toISOString(),
        source,
        input,
        workoutIds: generated.workoutIds,
      },
    };
  });
