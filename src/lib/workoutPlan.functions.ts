import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenRouterProvider, OPENROUTER_COACH_MODEL } from "./openrouter.server";
import { workouts } from "./workouts";
import type { SavedWorkoutPlan, WorkoutPlanInput } from "./workoutPlanStore";
import { getWorkoutSplitOption } from "./workoutSplits";

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

function requestedGoals(input: WorkoutPlanInput) {
  return input.goals?.length ? [...new Set(input.goals)] : [input.goal];
}

function scoreCandidate(workout: (typeof workouts)[number], input: WorkoutPlanInput) {
  let score = 0;
  const matchedGoals = requestedGoals(input).filter((goal) =>
    workout.recommendedForGoals.includes(goal),
  );
  score += matchedGoals.length * 18;
  if (workout.recommendedForGoals.includes(input.goal)) score += 4;
  if (workout.recommendedForLevels.includes(input.experience)) score += 16;
  score += workout.targetMuscles.filter((muscle) => input.focusAreas.includes(muscle)).length * 14;
  score += Math.max(0, 10 - Math.abs(workout.duration - input.sessionMinutes) / 2);
  return score;
}

function buildCandidates(input: WorkoutPlanInput) {
  const exactEquipment = workouts.filter(
    (workout) => input.equipment === "mixed" || workout.equipment.includes(input.equipment),
  );
  const ranked = exactEquipment
    .map((workout) => ({ workout, score: scoreCandidate(workout, input) }))
    .sort((a, b) => b.score - a.score);
  const selected: typeof ranked = [];
  const recentFamilies: string[] = [];
  for (const item of ranked) {
    const family = item.workout.targetMuscles.slice().sort().join("-") || item.workout.category;
    if (recentFamilies.slice(-2).includes(family) && selected.length < input.daysPerWeek * 3)
      continue;
    selected.push(item);
    recentFamilies.push(family);
    if (selected.length >= 24) break;
  }
  return selected.length >= input.daysPerWeek ? selected : ranked.slice(0, 24);
}

function fallbackPlan(input: WorkoutPlanInput, candidates: ReturnType<typeof buildCandidates>) {
  const picked: string[] = [];
  for (const goal of requestedGoals(input)) {
    const match = candidates.find(
      ({ workout }) => !picked.includes(workout.id) && workout.recommendedForGoals.includes(goal),
    );
    if (match) picked.push(match.workout.id);
    if (picked.length >= input.daysPerWeek) break;
  }
  for (const { workout } of candidates) {
    if (!picked.includes(workout.id)) picked.push(workout.id);
    if (picked.length >= input.daysPerWeek) break;
  }
  const focus = input.focusAreas
    .map((area) => area.charAt(0).toUpperCase() + area.slice(1))
    .join(" + ");
  const split = getWorkoutSplitOption(input.workoutSplit);
  const goalSummary = requestedGoals(input)
    .map((goal) => goal.replaceAll("_", " "))
    .join(" + ");
  return {
    name: `${split.shortName} · ${focus}`.slice(0, 50),
    summary: `A balanced ${input.daysPerWeek}-day ${split.shortName.toLowerCase()} plan combining ${goalSummary}, centered on ${focus.toLowerCase()}, and matched to your ${input.sessionMinutes}-minute sessions and available equipment.`,
    workoutIds: picked,
  };
}

export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .validator(InputSchema)
  .handler(async ({ data }): Promise<WorkoutPlanGenerationResult> => {
    const input = data as WorkoutPlanInput;
    const candidates = buildCandidates(input);
    const fallback = fallbackPlan(input, candidates);
    let generated = fallback;
    let source: SavedWorkoutPlan["source"] = "smart";
    const key = process.env.OPENROUTER_API_KEY;

    if (key && candidates.length >= input.daysPerWeek) {
      try {
        const provider = createOpenRouterProvider(key);
        const candidateData = candidates.map(({ workout }) => ({
          id: workout.id,
          title: workout.title,
          category: workout.category,
          duration: workout.duration,
          difficulty: workout.difficulty,
          muscles: workout.targetMuscles,
          exercises: workout.exercises.map((exercise) => exercise.name),
        }));
        const { output } = await generateText({
          model: provider(OPENROUTER_COACH_MODEL),
          output: Output.object({ schema: ModelPlanSchema }),
          system:
            "You are Ascendr's fitness programming engine. Select only provided workout IDs. Build a balanced, realistic weekly plan. Follow the requested workout split when provided, avoid training the same primary muscles hard on consecutive days, and respect experience, equipment, time, limitations, and requested focus. Do not make medical claims.",
          prompt: JSON.stringify({ request: input, candidates: candidateData }),
        });
        const allowed = new Set(candidateData.map((candidate) => candidate.id));
        const validIds = [...new Set(output.workoutIds)].filter((id) => allowed.has(id));
        if (validIds.length >= input.daysPerWeek) {
          generated = { ...output, workoutIds: validIds.slice(0, input.daysPerWeek) };
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
