import type { CompletedWorkout, ExerciseLog, SetLog, WeightUnit } from "./workoutSessionStore";

export type ProgressionKind = "weight" | "reps";

export interface ProgressionTarget {
  kind: ProgressionKind;
  sourceDate: string;
  lastWeight: number;
  lastReps: number;
  lastUnit: WeightUnit;
  targetWeight: number;
  targetReps: number;
  title: string;
  detail: string;
}

export interface PerformanceComparison {
  label: "Volume" | "Reps";
  current: number;
  previous: number;
  unit?: WeightUnit;
  changePercent: number;
}

export interface PersonalRecordHit {
  exerciseName: string;
  value: string;
}

export interface WorkoutMomentum {
  headline: string;
  detail: string;
  comparison?: PerformanceComparison;
  personalRecords: PersonalRecordHit[];
}

const POUNDS_PER_KILOGRAM = 2.20462;

function normaliseExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameExercise(a: Pick<ExerciseLog, "exerciseId" | "exerciseName">, b: ExerciseLog) {
  return (
    a.exerciseId === b.exerciseId ||
    normaliseExerciseName(a.exerciseName) === normaliseExerciseName(b.exerciseName)
  );
}

function convertWeight(weight: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) return weight;
  return from === "kg" ? weight * POUNDS_PER_KILOGRAM : weight / POUNDS_PER_KILOGRAM;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function completedRepSets(sets: SetLog[]) {
  return sets.filter((set) => set.completed && !set.plannedDurationSec && set.actualReps > 0);
}

function latestLoggedExercise(exercise: ExerciseLog, history: CompletedWorkout[]) {
  return [...history]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .flatMap((workout) =>
      workout.exercises
        .filter((logged) => isSameExercise(exercise, logged))
        .map((logged) => ({ workout, logged })),
    )
    .find(({ logged }) => completedRepSets(logged.sets).length > 0);
}

/**
 * Creates a conservative, explainable double-progression target from a user's
 * most recent logged working set. It deliberately does not prescribe effort,
 * pain, or medical recovery advice.
 */
export function getProgressionTarget(
  exercise: ExerciseLog,
  history: CompletedWorkout[],
  targetUnit: WeightUnit,
): ProgressionTarget | null {
  if (exercise.sets.some((set) => set.plannedDurationSec)) return null;

  const previous = latestLoggedExercise(exercise, history);
  if (!previous) return null;

  const previousSets = completedRepSets(previous.logged.sets);
  const bestRepSet = previousSets.reduce((best, set) =>
    set.actualReps > best.actualReps ? set : best,
  );
  const weightedSets = previousSets.filter((set) => set.weight > 0);

  if (exercise.isBodyweight || weightedSets.length === 0) {
    return {
      kind: "reps",
      sourceDate: previous.workout.completedAt,
      lastWeight: 0,
      lastReps: bestRepSet.actualReps,
      lastUnit: targetUnit,
      targetWeight: 0,
      targetReps: bestRepSet.actualReps + 1,
      title: `Aim for ${bestRepSet.actualReps + 1} reps`,
      detail: `Last time: ${bestRepSet.actualReps} reps. Add one clean rep when form stays controlled.`,
    };
  }

  const bestWeightedSet = weightedSets.reduce((best, set) => {
    if (set.weight !== best.weight) return set.weight > best.weight ? set : best;
    return set.actualReps > best.actualReps ? set : best;
  });
  const convertedWeight = convertWeight(bestWeightedSet.weight, bestWeightedSet.unit, targetUnit);
  const step = targetUnit === "kg" ? 2.5 : 5;

  if (bestWeightedSet.actualReps >= 12) {
    const targetWeight = roundToStep(convertedWeight + step, step);
    const targetReps = Math.max(6, bestWeightedSet.actualReps - 2);
    return {
      kind: "weight",
      sourceDate: previous.workout.completedAt,
      lastWeight: roundToStep(convertedWeight, 0.1),
      lastReps: bestWeightedSet.actualReps,
      lastUnit: targetUnit,
      targetWeight,
      targetReps,
      title: `Try ${targetWeight} ${targetUnit} for ${targetReps} reps`,
      detail: `You reached ${bestWeightedSet.actualReps} reps last time. Add one small load step and keep the reps smooth.`,
    };
  }

  const targetWeight = roundToStep(convertedWeight, 0.1);
  const targetReps = bestWeightedSet.actualReps + 1;
  return {
    kind: "reps",
    sourceDate: previous.workout.completedAt,
    lastWeight: targetWeight,
    lastReps: bestWeightedSet.actualReps,
    lastUnit: targetUnit,
    targetWeight,
    targetReps,
    title: `Keep ${targetWeight} ${targetUnit} · aim for ${targetReps} reps`,
    detail: `Last time: ${targetWeight} ${targetUnit} × ${bestWeightedSet.actualReps}. Earn the next load jump with one more clean rep.`,
  };
}

export function progressionPatch(target: ProgressionTarget): Pick<SetLog, "actualReps" | "weight"> {
  return { actualReps: target.targetReps, weight: target.targetWeight };
}

function convertVolume(volume: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) return volume;
  return from === "kg" ? volume * POUNDS_PER_KILOGRAM : volume / POUNDS_PER_KILOGRAM;
}

function findPreviousWorkout(current: CompletedWorkout, history: CompletedWorkout[]) {
  return [...history]
    .filter((workout) => workout.id !== current.id && workout.workoutId === current.workoutId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
}

function findPreviousExerciseSets(exercise: ExerciseLog, history: CompletedWorkout[]) {
  return history
    .flatMap((workout) => workout.exercises.filter((logged) => isSameExercise(exercise, logged)))
    .flatMap((logged) => completedRepSets(logged.sets));
}

/**
 * Gives the completed-session screen an honest comparison to past user logs.
 * It only calls something a record when an earlier matching log exists.
 */
export function getWorkoutMomentum(
  current: CompletedWorkout,
  history: CompletedWorkout[],
): WorkoutMomentum {
  const earlierHistory = history.filter((workout) => workout.id !== current.id);
  const previousWorkout = findPreviousWorkout(current, history);
  const personalRecords: PersonalRecordHit[] = [];

  for (const exercise of current.exercises) {
    const currentWeighted = completedRepSets(exercise.sets).filter((set) => set.weight > 0);
    if (!currentWeighted.length) continue;
    const earlierSets = findPreviousExerciseSets(exercise, earlierHistory).filter(
      (set) => set.weight > 0,
    );
    if (!earlierSets.length) continue;
    const currentBest = currentWeighted.reduce((best, set) =>
      set.weight > best.weight ? set : best,
    );
    const earlierBest = Math.max(
      ...earlierSets.map((set) => convertWeight(set.weight, set.unit, currentBest.unit)),
    );
    if (currentBest.weight > earlierBest + 0.01) {
      personalRecords.push({
        exerciseName: exercise.exerciseName,
        value: `${currentBest.weight} ${currentBest.unit} × ${currentBest.actualReps}`,
      });
    }
  }

  let comparison: PerformanceComparison | undefined;
  if (previousWorkout) {
    const previousVolume = convertVolume(
      previousWorkout.totalVolume,
      previousWorkout.unit,
      current.unit,
    );
    if (current.totalVolume > 0 && previousVolume > 0) {
      comparison = {
        label: "Volume",
        current: current.totalVolume,
        previous: Math.round(previousVolume),
        unit: current.unit,
        changePercent: Math.round(((current.totalVolume - previousVolume) / previousVolume) * 100),
      };
    } else if (current.totalReps > 0 && previousWorkout.totalReps > 0) {
      comparison = {
        label: "Reps",
        current: current.totalReps,
        previous: previousWorkout.totalReps,
        changePercent: Math.round(
          ((current.totalReps - previousWorkout.totalReps) / previousWorkout.totalReps) * 100,
        ),
      };
    }
  }

  if (personalRecords.length) {
    return {
      headline: `${personalRecords.length} personal record${personalRecords.length === 1 ? "" : "s"} earned`,
      detail: "Your strongest logged work is now part of your next-session target.",
      comparison,
      personalRecords: personalRecords.slice(0, 2),
    };
  }
  if (!comparison) {
    return {
      headline: "Benchmark saved",
      detail: "Finish this workout again to unlock a like-for-like performance comparison.",
      personalRecords: [],
    };
  }
  if (comparison.changePercent >= 5) {
    return {
      headline: `Up ${comparison.changePercent}% from last time`,
      detail: "More quality work than your last version of this session. Keep progression gradual.",
      comparison,
      personalRecords: [],
    };
  }
  if (comparison.changePercent <= -5) {
    return {
      headline: "Session saved to your trend",
      detail:
        "Training changes day to day. Your next target will use your most recent completed work.",
      comparison,
      personalRecords: [],
    };
  }
  return {
    headline: "You matched your last session",
    detail:
      "Consistency is progress. Your next workout will offer a small, earned progression target.",
    comparison,
    personalRecords: [],
  };
}
