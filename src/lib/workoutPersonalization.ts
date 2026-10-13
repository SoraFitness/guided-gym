import { EXERCISE_LIBRARY, type ExerciseLibraryItem } from "./workoutCatalog";
import type { Difficulty, Exercise, Workout } from "./workouts";
import type { EquipmentSetup, ExperienceLevel, Profile } from "./profile";

// Members who pick Core (the "six-pack" focus) get a short ab finisher on strength
// days. Visible abs come mostly from body fat, but direct ab work 2–3x a week is
// what builds the muscle that shows once fat is low enough.

export const CORE_FINISHER_SUFFIX = "-core-finisher";
const FINISHER_MINUTES = 5;

// Loaded movements first where equipment allows, then bodyweight staples.
const FINISHER_ORDER: Record<EquipmentSetup, string[]> = {
  gym: ["hanging-raise", "cable-crunch", "plank", "dead-bug"],
  mixed: ["hanging-raise", "cable-crunch", "plank", "dead-bug"],
  dumbbells: ["dead-bug", "russian-twist", "hollow-hold", "plank"],
  none: ["dead-bug", "hollow-hold", "plank", "russian-twist"],
};

const CORE_MUSCLE = /core|abs|oblique/i;

function difficultyFor(level: ExperienceLevel): Difficulty {
  return level === "beginner" ? "Beginner" : level === "advanced" ? "Advanced" : "Intermediate";
}

function finisherExercise(item: ExerciseLibraryItem, level: ExperienceLevel): Exercise {
  const beginner = level === "beginner";
  const time = beginner ? "30s" : level === "advanced" ? "45s" : "40s";
  return {
    id: `${item.id}${CORE_FINISHER_SUFFIX}`,
    name: item.name,
    sets: beginner ? 2 : 3,
    ...(item.timed ? { time } : { reps: beginner ? "10-12" : "12-15" }),
    rest: "45s",
    muscleGroup: item.muscleGroup,
    difficulty: difficultyFor(level),
    demoType: item.demoType,
  };
}

/** Looks up a finisher exercise by id, for screens that open one directly. */
export function findFinisherExercise(exerciseId: string, level: ExperienceLevel = "intermediate") {
  if (!exerciseId.endsWith(CORE_FINISHER_SUFFIX)) return undefined;
  const item = EXERCISE_LIBRARY.find(
    (exercise) => `${exercise.id}${CORE_FINISHER_SUFFIX}` === exerciseId,
  );
  return item ? finisherExercise(item, level) : undefined;
}

/** The workout as this member should do it. Returns the same object when nothing changes. */
export function personalizeWorkout(workout: Workout, profile: Profile | null | undefined): Workout {
  if (!profile?.focusAreas?.includes("core") || workout.category !== "Strength") return workout;
  const coreMoves = workout.exercises.filter((exercise) => CORE_MUSCLE.test(exercise.muscleGroup));
  const needed = 2 - coreMoves.length;
  if (needed <= 0) return workout;

  const taken = new Set(workout.exercises.map((exercise) => exercise.name));
  const finisher = FINISHER_ORDER[profile.equipment]
    .map((id) => EXERCISE_LIBRARY.find((item) => item.id === id))
    .filter(
      (item): item is ExerciseLibraryItem =>
        Boolean(item) && item!.equipment.includes(profile.equipment) && !taken.has(item!.name),
    )
    .slice(0, needed)
    .map((item) => finisherExercise(item, profile.experience));
  if (!finisher.length) return workout;

  return {
    ...workout,
    duration: workout.duration + FINISHER_MINUTES,
    calories: workout.calories + Math.round(FINISHER_MINUTES * 4),
    exercises: [...workout.exercises, ...finisher],
  };
}
