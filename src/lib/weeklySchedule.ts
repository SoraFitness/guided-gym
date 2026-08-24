import type { Profile, EquipmentSetup, ExperienceLevel } from "./profile";
import {
  getWorkout,
  workoutRecommendationService,
  type Workout,
  type Difficulty,
} from "./workouts";
import type { WorkoutSplitId } from "./workoutSplits";

export type SplitLabel =
  | "Push Day"
  | "Pull Day"
  | "Leg Day"
  | "Upper Body"
  | "Lower Body"
  | "Full Body Strength"
  | "Full Body Conditioning"
  | "Pull + Core"
  | "Conditioning / Core"
  | "Chest + Back"
  | "Shoulders + Arms"
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Arms"
  | "Power Upper"
  | "Power Lower"
  | "Hypertrophy Upper"
  | "Hypertrophy Lower"
  | "Rest";

export interface WeeklyScheduleDay {
  id: string;
  dayName: string;
  dateISO: string;
  splitLabel: SplitLabel;
  workoutId?: string;
  workoutTitle: string;
  focus: string;
  duration: number;
  difficulty: Difficulty;
  equipment: string;
  estimatedCalories: number;
  exercises: string[];
  isRestDay: boolean;
  isToday: boolean;
  isCompleted: boolean;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const AUTO_SPLITS: Record<2 | 3 | 4 | 5 | 6, SplitLabel[]> = {
  2: ["Full Body Strength", "Rest", "Full Body Conditioning", "Rest", "Rest", "Rest", "Rest"],
  3: ["Push Day", "Rest", "Pull Day", "Rest", "Leg Day", "Rest", "Rest"],
  4: ["Upper Body", "Rest", "Lower Body", "Rest", "Push Day", "Pull + Core", "Rest"],
  5: ["Push Day", "Pull Day", "Leg Day", "Rest", "Upper Body", "Conditioning / Core", "Rest"],
  6: ["Push Day", "Pull Day", "Leg Day", "Rest", "Push Day", "Pull Day", "Leg Day"],
};

const TRAINING_POSITIONS: Record<2 | 3 | 4 | 5 | 6, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 4, 5, 6],
};

const SPLIT_CYCLES: Record<Exclude<WorkoutSplitId, "auto">, SplitLabel[]> = {
  full_body: ["Full Body Strength", "Full Body Conditioning"],
  upper_lower: ["Upper Body", "Lower Body"],
  push_pull_legs: ["Push Day", "Pull Day", "Leg Day"],
  ppl_upper_lower: ["Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body"],
  phul: ["Power Upper", "Power Lower", "Hypertrophy Upper", "Hypertrophy Lower"],
  arnold: ["Chest + Back", "Shoulders + Arms", "Leg Day"],
  body_part: ["Chest", "Back", "Leg Day", "Shoulders", "Arms"],
};

function buildWeeklySplit(
  splitId: WorkoutSplitId,
  daysPerWeek: 2 | 3 | 4 | 5 | 6,
  weekStart: string,
): SplitLabel[] {
  if (splitId === "auto") return AUTO_SPLITS[daysPerWeek];

  const cycle = SPLIT_CYCLES[splitId];
  const labels: SplitLabel[] = Array.from({ length: 7 }, () => "Rest");
  const epochWeek = Math.floor(new Date(`${weekStart}T00:00:00Z`).getTime() / 604_800_000);
  const cycleOffset = (epochWeek * daysPerWeek) % cycle.length;

  TRAINING_POSITIONS[daysPerWeek].forEach((dayPosition, trainingIndex) => {
    labels[dayPosition] = cycle[(cycleOffset + trainingIndex) % cycle.length];
  });

  return labels;
}

type ExercisePoolLabel =
  | "Push Day"
  | "Pull Day"
  | "Leg Day"
  | "Upper Body"
  | "Lower Body"
  | "Full Body Strength"
  | "Full Body Conditioning"
  | "Pull + Core"
  | "Conditioning / Core";

// Equipment-specific exercise pools per split label
const EXERCISE_POOLS: Record<EquipmentSetup, Record<ExercisePoolLabel, string[]>> = {
  gym: {
    "Push Day": [
      "Bench Press",
      "Shoulder Press",
      "Incline DB Press",
      "Triceps Pushdown",
      "Lateral Raise",
    ],
    "Pull Day": ["Lat Pulldown", "Cable Row", "Barbell Row", "Face Pull", "Bicep Curl"],
    "Leg Day": ["Barbell Squat", "Leg Press", "Romanian Deadlift", "Hamstring Curl", "Calf Raise"],
    "Upper Body": ["Bench Press", "Lat Pulldown", "Shoulder Press", "Cable Row", "Bicep Curl"],
    "Lower Body": ["Barbell Squat", "Leg Press", "Hamstring Curl", "Walking Lunge", "Calf Raise"],
    "Full Body Strength": ["Barbell Squat", "Bench Press", "Cable Row", "Shoulder Press", "Plank"],
    "Full Body Conditioning": [
      "Kettlebell Swing",
      "Goblet Squat",
      "Push Press",
      "Row Erg",
      "Burpees",
    ],
    "Pull + Core": ["Lat Pulldown", "Cable Row", "Face Pull", "Cable Crunch", "Hanging Leg Raise"],
    "Conditioning / Core": [
      "Assault Bike",
      "Kettlebell Swing",
      "Cable Crunch",
      "Plank",
      "Mountain Climbers",
    ],
  },
  dumbbells: {
    "Push Day": [
      "DB Bench Press",
      "DB Shoulder Press",
      "Incline DB Press",
      "Skullcrusher",
      "DB Lateral Raise",
    ],
    "Pull Day": ["DB Row", "Renegade Row", "Reverse Fly", "Hammer Curl", "DB Curl"],
    "Leg Day": ["Goblet Squat", "DB Romanian Deadlift", "DB Lunge", "DB Step Up", "Calf Raise"],
    "Upper Body": ["DB Bench", "DB Row", "DB Shoulder Press", "Hammer Curl", "Skullcrusher"],
    "Lower Body": ["Goblet Squat", "DB RDL", "DB Lunge", "Glute Bridge", "Calf Raise"],
    "Full Body Strength": ["Goblet Squat", "DB Bench", "DB Row", "DB Press", "Plank"],
    "Full Body Conditioning": ["DB Thruster", "DB Swing", "Renegade Row", "DB Lunge", "Burpees"],
    "Pull + Core": ["DB Row", "Reverse Fly", "Hammer Curl", "Plank", "Russian Twist"],
    "Conditioning / Core": [
      "DB Thruster",
      "Burpees",
      "Mountain Climbers",
      "Plank",
      "Russian Twist",
    ],
  },
  none: {
    "Push Day": [
      "Push Ups",
      "Pike Push Ups",
      "Decline Push Ups",
      "Diamond Push Ups",
      "Triceps Dips",
    ],
    "Pull Day": ["Pull Ups", "Inverted Row", "Doorway Row", "Superman", "Reverse Snow Angels"],
    "Leg Day": [
      "Bodyweight Squat",
      "Reverse Lunge",
      "Glute Bridge",
      "Bulgarian Split Squat",
      "Calf Raise",
    ],
    "Upper Body": ["Push Ups", "Pull Ups", "Pike Push Ups", "Inverted Row", "Triceps Dips"],
    "Lower Body": ["Squat", "Lunge", "Glute Bridge", "Step Up", "Wall Sit"],
    "Full Body Strength": ["Squat", "Push Ups", "Inverted Row", "Glute Bridge", "Plank"],
    "Full Body Conditioning": [
      "Burpees",
      "Jump Squats",
      "Mountain Climbers",
      "Push Ups",
      "High Knees",
    ],
    "Pull + Core": ["Pull Ups", "Superman", "Plank", "Hollow Hold", "Leg Raise"],
    "Conditioning / Core": [
      "Burpees",
      "Mountain Climbers",
      "Plank",
      "Russian Twist",
      "Jumping Jacks",
    ],
  },
  mixed: {} as Record<ExercisePoolLabel, string[]>,
};
// Mixed reuses gym pool
EXERCISE_POOLS.mixed = EXERCISE_POOLS.gym;

const EQUIPMENT_LABEL: Record<EquipmentSetup, string> = {
  gym: "Full gym",
  dumbbells: "Dumbbells",
  none: "Bodyweight",
  mixed: "Mixed setup",
};

function focusFor(label: SplitLabel): string {
  switch (label) {
    case "Push Day":
      return "Chest · Shoulders · Triceps";
    case "Pull Day":
      return "Back · Biceps · Rear Delts";
    case "Leg Day":
      return "Quads · Hamstrings · Glutes";
    case "Upper Body":
      return "Chest · Back · Shoulders · Arms";
    case "Lower Body":
      return "Quads · Glutes · Hamstrings";
    case "Full Body Strength":
      return "Full Body · Compound Lifts";
    case "Full Body Conditioning":
      return "Full Body · Cardio";
    case "Pull + Core":
      return "Back · Core";
    case "Conditioning / Core":
      return "Cardio · Core";
    case "Chest + Back":
      return "Chest · Back · Rear Delts";
    case "Shoulders + Arms":
      return "Shoulders · Biceps · Triceps";
    case "Chest":
      return "Chest · Front Delts · Triceps";
    case "Back":
      return "Lats · Upper Back · Biceps";
    case "Shoulders":
      return "Front · Side · Rear Delts";
    case "Arms":
      return "Biceps · Triceps · Forearms";
    case "Power Upper":
      return "Upper Body · Heavy Compounds";
    case "Power Lower":
      return "Lower Body · Heavy Compounds";
    case "Hypertrophy Upper":
      return "Upper Body · Muscle Growth";
    case "Hypertrophy Lower":
      return "Lower Body · Muscle Growth";
    case "Rest":
      return "Recovery";
  }
}

function exercisePoolLabel(label: Exclude<SplitLabel, "Rest">): ExercisePoolLabel {
  switch (label) {
    case "Chest + Back":
    case "Power Upper":
    case "Hypertrophy Upper":
    case "Shoulders + Arms":
    case "Shoulders":
    case "Arms":
      return "Upper Body";
    case "Chest":
      return "Push Day";
    case "Back":
      return "Pull Day";
    case "Power Lower":
    case "Hypertrophy Lower":
      return "Lower Body";
    default:
      return label;
  }
}

function matchWorkoutId(label: SplitLabel, ranked: Workout[]): string | undefined {
  const pick = (fn: (w: Workout) => boolean) => {
    const matches = ranked.filter(fn);
    return matches[0]?.id;
  };
  const pickCompatible = () => pick((workout) => workoutFitsScheduledSplit(label, workout));
  switch (label) {
    case "Push Day":
      return pick((w) => w.id === "push-strength") ?? pickCompatible();
    case "Pull Day":
      return pick((w) => w.id === "pull-strength") ?? pickCompatible();
    case "Leg Day":
      return pick((w) => w.id === "lower-body-burn") ?? pickCompatible();
    case "Upper Body":
      return pick((w) => w.id === "upper-body-strength") ?? pickCompatible();
    case "Lower Body":
      return pick((w) => w.id === "lower-body-burn") ?? pickCompatible();
    case "Full Body Strength":
      return (
        pick((w) => w.id === "dumbbell-builder" || w.id === "bodyweight-starter") ??
        pickCompatible()
      );
    case "Full Body Conditioning":
      return pick((w) => w.id === "full-body-sweat") ?? pickCompatible();
    case "Pull + Core":
      return pickCompatible();
    case "Conditioning / Core":
      return pickCompatible();
    case "Chest + Back":
      return pickCompatible();
    case "Shoulders + Arms":
    case "Arms":
      return pickCompatible();
    case "Chest":
      return pickCompatible();
    case "Back":
      return pickCompatible();
    case "Shoulders":
      return pickCompatible();
    case "Power Upper":
    case "Hypertrophy Upper":
      return pickCompatible();
    case "Power Lower":
    case "Hypertrophy Lower":
      return pickCompatible();
    default:
      return undefined;
  }
}

/**
 * Saved plans are a set of workouts, not a calendar. Never blindly assign them by
 * array position: a Push workout in a saved plan must not become the Details view
 * for a scheduled Leg day.
 */
function workoutFitsScheduledSplit(label: SplitLabel, workout: Workout): boolean {
  const muscles = new Set(workout.targetMuscles);
  const has = (...targets: Parameters<typeof muscles.has>[0][]) =>
    targets.some((target) => muscles.has(target));
  const hasUpper = has("chest", "back", "arms");
  const hasLower = has("legs", "glutes");
  const isUpperFocused = hasUpper && !hasLower;
  const isLowerFocused = hasLower && !hasUpper && workout.category !== "Cardio";
  const isFullBodyStrength = hasUpper && hasLower && workout.category === "Strength";

  switch (label) {
    case "Push Day":
    case "Chest":
      return has("chest") && isUpperFocused;
    case "Pull Day":
    case "Back":
    case "Pull + Core":
      return has("back") && isUpperFocused;
    case "Leg Day":
    case "Lower Body":
    case "Power Lower":
    case "Hypertrophy Lower":
      return isLowerFocused;
    case "Upper Body":
    case "Power Upper":
    case "Hypertrophy Upper":
    case "Chest + Back":
      return isUpperFocused;
    case "Shoulders + Arms":
    case "Shoulders":
    case "Arms":
      return has("arms") && isUpperFocused;
    case "Full Body Strength":
      return isFullBodyStrength;
    case "Full Body Conditioning":
      return (
        workout.category === "HIIT" || (hasUpper && hasLower && workout.category !== "Mobility")
      );
    case "Conditioning / Core":
      return workout.category === "HIIT" || workout.category === "Cardio" || has("cardio", "core");
    case "Rest":
      return false;
  }
}

function difficultyFor(level: ExperienceLevel): Difficulty {
  return level === "beginner" ? "Beginner" : level === "advanced" ? "Advanced" : "Intermediate";
}

function localDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayFor(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function weekStartISO(): string {
  return localDateISO(mondayFor(new Date()));
}

const COMPLETION_KEY = "fitness:weeklyCompletion";

interface CompletionState {
  weekStartISO: string;
  completed: Record<string, true>;
}

export function loadCompletion(): CompletionState {
  try {
    const raw = localStorage.getItem(COMPLETION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompletionState;
      if (parsed.weekStartISO === weekStartISO()) return parsed;
    }
  } catch {
    // Ignore malformed device-local completion state and start a fresh week.
  }
  return { weekStartISO: weekStartISO(), completed: {} };
}

export function saveCompletion(state: CompletionState) {
  localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
}

export function toggleCompletion(dayId: string): CompletionState {
  const cur = loadCompletion();
  const next: CompletionState = {
    weekStartISO: cur.weekStartISO,
    completed: { ...cur.completed },
  };
  if (next.completed[dayId]) delete next.completed[dayId];
  else next.completed[dayId] = true;
  saveCompletion(next);
  return next;
}

export const weeklyScheduleService = {
  generateSchedule(
    profile: Profile,
    activeWorkoutIds: string[] = [],
    referenceDate: Date = new Date(),
  ): WeeklyScheduleDay[] {
    const monday = mondayFor(referenceDate);
    const scheduleWeekStart = localDateISO(monday);
    const completion = loadCompletion();
    const split = buildWeeklySplit(
      profile.workoutSplit ?? "auto",
      profile.daysPerWeek,
      scheduleWeekStart,
    );
    const pool = EXERCISE_POOLS[profile.equipment];
    const ranked = workoutRecommendationService.recommend(profile, 500);
    const savedPlanWorkouts = activeWorkoutIds
      .map(getWorkout)
      .filter((workout): workout is Workout => Boolean(workout));

    return split.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateISO = localDateISO(date);
      const id = `${scheduleWeekStart}-${i}`;
      const isToday = dateISO === localDateISO(new Date());
      const isCompleted =
        completion.weekStartISO === scheduleWeekStart && !!completion.completed[id];

      if (label === "Rest") {
        return {
          id,
          dayName: DAY_NAMES[i],
          dateISO,
          splitLabel: label,
          workoutTitle: "Rest & Recovery",
          focus: "Recovery",
          duration: 0,
          difficulty: "Beginner" as Difficulty,
          equipment: "—",
          estimatedCalories: 0,
          exercises: [],
          isRestDay: true,
          isToday,
          isCompleted,
        };
      }

      const savedPlanWorkout = savedPlanWorkouts.find((workout) =>
        workoutFitsScheduledSplit(label, workout),
      );
      const matchedWorkoutId = matchWorkoutId(label, ranked);
      const w = savedPlanWorkout ?? ranked.find((workout) => workout.id === matchedWorkoutId);
      const workoutId = w?.id;
      const exercises =
        w?.exercises.map((exercise) => exercise.name) ?? pool[exercisePoolLabel(label)] ?? [];
      const duration = profile.sessionMinutes;
      const difficulty = difficultyFor(profile.experience);
      const caloriesPerMin = w ? w.calories / w.duration : 7;
      const estimatedCalories = Math.round(caloriesPerMin * duration);

      return {
        id,
        dayName: DAY_NAMES[i],
        dateISO,
        splitLabel: label,
        workoutId,
        workoutTitle: w?.title ?? label,
        focus: focusFor(label),
        duration,
        difficulty,
        equipment: EQUIPMENT_LABEL[profile.equipment],
        estimatedCalories,
        exercises: exercises.slice(0, 5),
        isRestDay: false,
        isToday,
        isCompleted,
      };
    });
  },

  generateMonthSchedule(
    profile: Profile,
    month: Date,
    activeWorkoutIds: string[] = [],
  ): WeeklyScheduleDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const firstMonday = mondayFor(firstDay);
    const lastMonday = mondayFor(lastDay);
    const schedule: WeeklyScheduleDay[] = [];

    for (let weekStart = firstMonday; weekStart <= lastMonday; ) {
      schedule.push(
        ...weeklyScheduleService.generateSchedule(profile, activeWorkoutIds, weekStart),
      );
      const nextWeek = new Date(weekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = nextWeek;
    }

    return schedule;
  },
};
