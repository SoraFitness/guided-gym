import { getWorkout, workouts, type Workout } from "./workouts";
import type { Profile } from "./profile";
import { planInputFromProfile, type WorkoutPlanInput } from "./workoutPlanStore";
import { getWorkoutSplitOption } from "./workoutSplits";
import { isProgramWorkout, splitLabelForWorkout, type SplitLabel } from "./weeklySchedule";

// Builds the ordered weekly program behind a saved plan: one workout per
// training day, listed in the order the days are trained. Shared by the AI plan
// generator (as candidates and fallback) and onboarding (when AI is offline).

type SessionType = Exclude<SplitLabel, "Rest">;
type DaysPerWeek = WorkoutPlanInput["daysPerWeek"];

export interface ProgramCandidate {
  workout: Workout;
  score: number;
}

export interface ProgramDraft {
  name: string;
  summary: string;
  workoutIds: string[];
}

// Proven weekly structures per goal. Their order keeps sessions for the same
// muscles off back-to-back training days in the weekly calendar.
const STRENGTH_WEEKS: Record<DaysPerWeek, SessionType[]> = {
  2: ["Full Body Strength", "Full Body Strength"],
  3: ["Push Day", "Pull Day", "Leg Day"],
  4: ["Upper Body", "Lower Body", "Upper Body", "Leg Day"],
  5: ["Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body"],
  6: ["Push Day", "Pull Day", "Leg Day", "Push Day", "Pull Day", "Leg Day"],
};
const FAT_LOSS_WEEKS: Record<DaysPerWeek, SessionType[]> = {
  2: ["Full Body Strength", "Full Body Conditioning"],
  3: ["Full Body Strength", "Full Body Conditioning", "Full Body Strength"],
  4: ["Upper Body", "Lower Body", "Full Body Conditioning", "Full Body Strength"],
  5: ["Upper Body", "Lower Body", "Full Body Conditioning", "Push Day", "Leg Day"],
  6: [
    "Push Day",
    "Pull Day",
    "Leg Day",
    "Full Body Conditioning",
    "Upper Body",
    "Conditioning / Core",
  ],
};
const ENDURANCE_WEEKS: Record<DaysPerWeek, SessionType[]> = {
  2: ["Full Body Conditioning", "Full Body Strength"],
  3: ["Full Body Conditioning", "Full Body Strength", "Full Body Conditioning"],
  4: ["Full Body Conditioning", "Upper Body", "Full Body Conditioning", "Lower Body"],
  5: [
    "Full Body Conditioning",
    "Upper Body",
    "Full Body Conditioning",
    "Lower Body",
    "Conditioning / Core",
  ],
  6: [
    "Full Body Conditioning",
    "Upper Body",
    "Full Body Conditioning",
    "Lower Body",
    "Full Body Conditioning",
    "Full Body Strength",
  ],
};

// Close substitutes when the catalog has no match for a session type.
const RELATED_SESSIONS: Partial<Record<SessionType, SessionType[]>> = {
  "Push Day": ["Upper Body"],
  "Pull Day": ["Upper Body"],
  "Leg Day": ["Lower Body"],
  "Lower Body": ["Leg Day"],
  "Upper Body": ["Push Day", "Pull Day"],
  "Full Body Strength": ["Upper Body", "Lower Body"],
  "Full Body Conditioning": ["Conditioning / Core"],
  "Conditioning / Core": ["Full Body Conditioning"],
};

export function requestedGoals(input: WorkoutPlanInput) {
  return input.goals?.length ? [...new Set(input.goals)] : [input.goal];
}

/** The session type for each training day of the week, in training order. */
export function weeklySessionTypes(input: WorkoutPlanInput): SessionType[] {
  const primaryGoal = requestedGoals(input)[0];
  if (primaryGoal === "endurance") return ENDURANCE_WEEKS[input.daysPerWeek];
  if (primaryGoal === "lose_weight") return FAT_LOSS_WEEKS[input.daysPerWeek];
  if (input.experience === "beginner" && input.daysPerWeek === 3) {
    return ["Full Body Strength", "Full Body Strength", "Full Body Strength"];
  }
  return STRENGTH_WEEKS[input.daysPerWeek];
}

function scoreCandidate(workout: Workout, input: WorkoutPlanInput) {
  let score = 0;
  const matchedGoals = requestedGoals(input).filter((goal) =>
    workout.recommendedForGoals.includes(goal),
  );
  score += matchedGoals.length * 18;
  if (workout.recommendedForGoals.includes(input.goal)) score += 4;
  if (workout.recommendedForLevels.includes(input.experience)) score += 16;
  score += workout.targetMuscles.filter((muscle) => input.focusAreas.includes(muscle)).length * 14;
  score += Math.max(0, 10 - Math.abs(workout.duration - input.sessionMinutes) / 2);
  // A gym member should get gym workouts, not the bodyweight ones every setup can do.
  if (builtForEquipment(workout, input.equipment)) score += 20;
  return score;
}

/** The setup a workout was designed around (its first listed equipment). */
export function builtForEquipment(workout: Workout, setup: WorkoutPlanInput["equipment"]) {
  return workout.equipment[0] === setup;
}

/** Built for the member's own equipment, session length, level, and one of their goals. */
function fitsMember(workout: Workout, input: WorkoutPlanInput) {
  return (
    builtForEquipment(workout, input.equipment) &&
    workout.duration === input.sessionMinutes &&
    workout.recommendedForLevels.includes(input.experience) &&
    requestedGoals(input).some((goal) => workout.recommendedForGoals.includes(goal))
  );
}

/** The best few workouts of every session type that fit the member's equipment. */
export function buildProgramCandidates(input: WorkoutPlanInput): ProgramCandidate[] {
  const ranked = workouts
    .filter(
      (workout) =>
        isProgramWorkout(workout) &&
        (input.equipment === "mixed" || workout.equipment.includes(input.equipment)),
    )
    .map((workout) => ({ workout, score: scoreCandidate(workout, input) }))
    .sort((a, b) => b.score - a.score);
  // Per session type, offer only workouts built for the member's own session length,
  // level, and goal when any exist, so the AI planner can't pick a mismatched session.
  const byType = new Map<SessionType, ProgramCandidate[]>();
  for (const candidate of ranked) {
    const type = splitLabelForWorkout(candidate.workout);
    byType.set(type, [...(byType.get(type) ?? []), candidate]);
  }
  const chosen = new Set<ProgramCandidate>();
  for (const list of byType.values()) {
    const fitting = list.filter(({ workout }) => fitsMember(workout, input));
    for (const candidate of (fitting.length ? fitting : list).slice(0, 3)) chosen.add(candidate);
  }
  return ranked.filter((candidate) => chosen.has(candidate));
}

function sessionType(workoutId: string) {
  const workout = getWorkout(workoutId);
  return workout ? splitLabelForWorkout(workout) : workoutId;
}

/** Keeps the given order but never trains the same session type on back-to-back days. */
export function orderProgramSessions(workoutIds: string[]): string[] {
  const remaining = [...workoutIds];
  const ordered: string[] = [];
  while (remaining.length) {
    const previous = ordered.at(-1);
    const previousType = previous ? sessionType(previous) : null;
    const index = remaining.findIndex((id) => sessionType(id) !== previousType);
    ordered.push(...remaining.splice(index >= 0 ? index : 0, 1));
  }
  return ordered;
}

export function fallbackProgram(
  input: WorkoutPlanInput,
  candidates: ProgramCandidate[] = buildProgramCandidates(input),
): ProgramDraft {
  const used = new Set<string>();
  // A workout built for the member's own session length, level, and goal beats a
  // fresh one that isn't: repeating it (an A/B/A week) beats a mismatched session.
  const fits = (workout: Workout) => fitsMember(workout, input);
  const byType = (type: SessionType, allowRepeat: boolean, mustFit = false) =>
    candidates.find(
      ({ workout }) =>
        splitLabelForWorkout(workout) === type &&
        (allowRepeat || !used.has(workout.id)) &&
        (!mustFit || fits(workout)),
    );
  const pick = (type: SessionType) => {
    const types = [type, ...(RELATED_SESSIONS[type] ?? [])];
    const choice =
      byType(type, false, true) ??
      byType(type, true, true) ??
      types.map((candidateType) => byType(candidateType, false)).find(Boolean) ??
      types.map((candidateType) => byType(candidateType, true)).find(Boolean) ??
      candidates.find(({ workout }) => !used.has(workout.id)) ??
      candidates[0];
    if (choice) used.add(choice.workout.id);
    return choice?.workout.id;
  };
  const workoutIds = weeklySessionTypes(input)
    .map(pick)
    .filter((id): id is string => Boolean(id));

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
    workoutIds: orderProgramSessions(workoutIds),
  };
}

const profilePrograms = new Map<string, string[]>();

/**
 * The program for a member with no saved plan matching their current profile, e.g.
 * right after they change goal, equipment, or schedule. Built the same way as the
 * onboarding plan, so the week keeps following their goal instead of a generic split.
 */
export function programForProfile(profile: Profile): string[] {
  const input = planInputFromProfile(profile);
  const key = JSON.stringify(input);
  let workoutIds = profilePrograms.get(key);
  if (!workoutIds) {
    workoutIds = fallbackProgram(input).workoutIds;
    profilePrograms.set(key, workoutIds);
  }
  return workoutIds;
}
