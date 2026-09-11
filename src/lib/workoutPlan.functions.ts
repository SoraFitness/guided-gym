import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
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
  "Do not make medical claims.",
].join(" ");

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
        const { output } = await generateText({
          model: provider(OPENROUTER_COACH_MODEL),
          output: Output.object({ schema: ModelPlanSchema }),
          system: SYSTEM_PROMPT,
          prompt: JSON.stringify({ request: input, candidates: candidateData }),
        });
        const allowed = new Set(candidateData.map((candidate) => candidate.id));
        const sessions = output.workoutIds
          .filter((id) => allowed.has(id))
          .slice(0, input.daysPerWeek);
        if (sessions.length === input.daysPerWeek) {
          generated = { ...output, workoutIds: orderProgramSessions(sessions) };
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
