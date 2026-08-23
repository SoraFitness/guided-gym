import type { ExperienceLevel, FocusArea } from "./profile";
import type { CompletedWorkout } from "./workoutSessionStore";

export const CANONICAL_MUSCLES = [
  "shoulders",
  "chest",
  "back",
  "arms",
  "core",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;

export type CanonicalMuscle = (typeof CANONICAL_MUSCLES)[number];
export type MuscleStatus = "Recovering" | "Needs volume" | "Ready" | "On track" | "High load";

export interface MuscleInsight {
  muscle: CanonicalMuscle;
  label: string;
  readiness: number;
  coverage: number;
  priority: number;
  status: MuscleStatus;
  lastTrainedAt: string | null;
  sets7d: number;
  targetSets: number;
  scanScore?: number | null;
  scanVisibility?: "clear" | "partial" | "not_visible";
}

export interface MuscleScanMetric {
  score: number | null;
  visibility?: "clear" | "partial" | "not_visible";
}

export interface ComputeMuscleInsightsInput {
  history: CompletedWorkout[];
  experience?: ExperienceLevel;
  focusAreas?: FocusArea[];
  plannedSets?: Partial<Record<CanonicalMuscle, number>>;
  scanScores?: Partial<Record<CanonicalMuscle, MuscleScanMetric>>;
  now?: Date;
}

const LABELS: Record<CanonicalMuscle, string> = {
  shoulders: "Shoulders",
  chest: "Chest",
  back: "Back",
  arms: "Arms",
  core: "Core",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

const FALLBACK_TARGETS: Record<ExperienceLevel, number> = {
  beginner: 6,
  intermediate: 10,
  advanced: 14,
};

const FOCUS_MAP: Record<FocusArea, CanonicalMuscle[]> = {
  chest: ["chest"],
  back: ["back"],
  legs: ["quads", "hamstrings", "calves"],
  glutes: ["glutes"],
  arms: ["arms"],
  core: ["core"],
  cardio: [],
  mobility: [],
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

/**
 * Maps the catalogue's intentionally human-readable muscle labels into the nine
 * stable regions shared by training analytics and Body Scan. Compound labels
 * distribute a set so they do not over-count one completed set several times.
 */
export function canonicalMuscleWeights(label: string): Partial<Record<CanonicalMuscle, number>> {
  const key = normalize(label);
  if (!key || key === "cardio" || key === "mobility") return {};
  if (key === "full body") {
    return {
      shoulders: 0.125,
      chest: 0.125,
      back: 0.125,
      arms: 0.125,
      core: 0.125,
      glutes: 0.125,
      quads: 0.125,
      hamstrings: 0.125,
    };
  }
  if (key === "posterior chain") return { back: 1 / 3, glutes: 1 / 3, hamstrings: 1 / 3 };
  if (key === "legs") return { quads: 0.5, hamstrings: 0.5 };
  if (key === "spine") return { back: 0.5, core: 0.5 };
  if (key === "hips") return { glutes: 1 };
  if (key === "ankles") return { calves: 1 };
  if (key.includes("shoulder") || key.includes("delt")) return { shoulders: 1 };
  if (key.includes("chest") || key.includes("pec")) return { chest: 1 };
  if (key.includes("back") || key.includes("lat")) return { back: 1 };
  if (key.includes("bicep") || key.includes("tricep") || key.includes("arm")) return { arms: 1 };
  if (key.includes("core") || key.includes("ab") || key.includes("oblique")) return { core: 1 };
  if (key.includes("glute")) return { glutes: 1 };
  if (key.includes("quad")) return { quads: 1 };
  if (key.includes("hamstring")) return { hamstrings: 1 };
  if (key.includes("calf") || key.includes("calves")) return { calves: 1 };
  return {};
}

export function computeMuscleInsights({
  history,
  experience = "intermediate",
  focusAreas = [],
  plannedSets = {},
  scanScores = {},
  now = new Date(),
}: ComputeMuscleInsightsInput): MuscleInsight[] {
  const weekStartMs = now.getTime() - 7 * 24 * 60 * 60 * 1_000;
  const sets7d = Object.fromEntries(CANONICAL_MUSCLES.map((muscle) => [muscle, 0])) as Record<
    CanonicalMuscle,
    number
  >;
  const lastTrained = Object.fromEntries(
    CANONICAL_MUSCLES.map((muscle) => [muscle, null]),
  ) as Record<CanonicalMuscle, string | null>;

  for (const workout of history) {
    const workoutAt = new Date(workout.completedAt).getTime();
    if (!Number.isFinite(workoutAt) || workoutAt > now.getTime()) continue;
    for (const exercise of workout.exercises) {
      const weights = canonicalMuscleWeights(exercise.muscleGroup);
      const completedSets = exercise.sets.filter((set) => set.completed);
      if (!completedSets.length) continue;
      for (const muscle of CANONICAL_MUSCLES) {
        const weight = weights[muscle] ?? 0;
        if (!weight) continue;
        const latestSetAt = completedSets.reduce((latest, set) => {
          const setAt = set.completedAt ? new Date(set.completedAt).getTime() : workoutAt;
          return Number.isFinite(setAt) ? Math.max(latest, setAt) : latest;
        }, workoutAt);
        const existing = lastTrained[muscle]
          ? new Date(lastTrained[muscle] as string).getTime()
          : -Infinity;
        if (latestSetAt > existing) lastTrained[muscle] = new Date(latestSetAt).toISOString();
        if (workoutAt >= weekStartMs) sets7d[muscle] += completedSets.length * weight;
      }
    }
  }

  const focused = new Set(focusAreas.flatMap((area) => FOCUS_MAP[area]));
  const fallbackTarget = FALLBACK_TARGETS[experience];

  return CANONICAL_MUSCLES.map((muscle) => {
    const targetSets = Math.max(1, plannedSets[muscle] ?? fallbackTarget);
    const recentSets = Math.round(sets7d[muscle] * 10) / 10;
    const coverage = Math.round(clamp((recentSets / targetSets) * 100, 0, 150));
    const last = lastTrained[muscle];
    const hoursSince = last
      ? Math.max(0, (now.getTime() - new Date(last).getTime()) / (60 * 60 * 1_000))
      : Infinity;
    const baseRecovery = Number.isFinite(hoursSince) ? clamp((hoursSince / 72) * 100) : 100;
    const overloadPenalty = coverage > 125 ? Math.min(30, ((coverage - 125) / 25) * 15) : 0;
    const readiness = Math.round(clamp(baseRecovery - overloadPenalty));
    const missingCoverage = 100 - Math.min(100, coverage);
    const priority = Math.round(
      clamp(readiness * 0.65 + missingCoverage * 0.35 + (focused.has(muscle) ? 10 : 0)),
    );

    let status: MuscleStatus;
    if (coverage > 125) status = "High load";
    else if (readiness < 60) status = "Recovering";
    else if (coverage < 50) status = "Needs volume";
    else if (readiness >= 80 && coverage < 100) status = "Ready";
    else status = "On track";

    return {
      muscle,
      label: LABELS[muscle],
      readiness,
      coverage,
      priority,
      status,
      lastTrainedAt: last,
      sets7d: recentSets,
      targetSets,
      scanScore: scanScores[muscle]?.score,
      scanVisibility: scanScores[muscle]?.visibility,
    };
  }).sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}

export function muscleInsightsById(insights: MuscleInsight[]) {
  return Object.fromEntries(insights.map((insight) => [insight.muscle, insight])) as Record<
    CanonicalMuscle,
    MuscleInsight
  >;
}

export function muscleMetricLabel(
  insight: MuscleInsight | undefined,
  mode: "training" | "physique",
) {
  if (!insight) return "No training data";
  if (mode === "physique") {
    return insight.scanScore == null ? "Not visible" : `${Math.round(insight.scanScore)} / 100`;
  }
  return `${insight.priority}% train-next priority`;
}
