import type { Profile, EquipmentSetup, ExperienceLevel } from "./profile";
import {
  getWorkout,
  workoutRecommendationService,
  type Workout,
  type Difficulty,
} from "./workouts";
import type { SavedWorkoutPlan } from "./workoutPlanStore";
import { programForProfile } from "./workoutProgram";
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

/** The part of a saved plan the calendar needs: its ordered sessions and when it started. */
export type ScheduledPlan = Pick<SavedWorkoutPlan, "workoutIds" | "createdAt">;

type ScheduleDayBase = Pick<
  WeeklyScheduleDay,
  "id" | "dayName" | "dateISO" | "isToday" | "isCompleted"
>;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Smart Split templates for members without a saved plan. Day 0 is the day the
// member finished onboarding, not Monday, so their first day is never a rest day.
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
  splitId: Exclude<WorkoutSplitId, "auto">,
  daysPerWeek: 2 | 3 | 4 | 5 | 6,
  weekStart: string,
): SplitLabel[] {
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
    case "Rest":
      return undefined;
    default:
      return pickCompatible();
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

/** Recovery sessions belong on rest days, so they never fill a training day. */
export function isProgramWorkout(workout: Workout) {
  return workout.category !== "Mobility";
}

/** The kind of training day a workout represents, used when a plan sets the calendar. */
export function splitLabelForWorkout(workout: Workout): Exclude<SplitLabel, "Rest"> {
  const muscles = new Set(workout.targetMuscles);
  const hasUpper = muscles.has("chest") || muscles.has("back") || muscles.has("arms");
  const hasLower = muscles.has("legs") || muscles.has("glutes");
  if (workout.category === "HIIT" || workout.category === "Cardio") return "Full Body Conditioning";
  if (workout.category !== "Strength" || (!hasUpper && !hasLower)) return "Conditioning / Core";
  if ((hasUpper && hasLower) || /full body/i.test(workout.title)) return "Full Body Strength";
  if (hasLower) return muscles.has("core") ? "Lower Body" : "Leg Day";
  if (muscles.has("chest") && !muscles.has("back")) return "Push Day";
  if (muscles.has("back") && !muscles.has("chest")) return "Pull Day";
  return "Upper Body";
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

function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86_400_000);
}

/** The plan session trained on a given day, or null for a rest day. */
function programSessionFor(
  daysSinceStart: number,
  daysPerWeek: 2 | 3 | 4 | 5 | 6,
  sessions: Workout[],
): Workout | null {
  if (daysSinceStart < 0) return null;
  const positions = TRAINING_POSITIONS[daysPerWeek];
  const position = positions.indexOf(daysSinceStart % 7);
  if (position < 0) return null;
  const sessionNumber = Math.floor(daysSinceStart / 7) * positions.length + position;
  return sessions[sessionNumber % sessions.length];
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

function restDay(day: ScheduleDayBase): WeeklyScheduleDay {
  return {
    ...day,
    splitLabel: "Rest",
    workoutTitle: "Rest & Recovery",
    focus: "Recovery",
    duration: 0,
    difficulty: "Beginner",
    equipment: "—",
    estimatedCalories: 0,
    exercises: [],
    isRestDay: true,
  };
}

function trainingDay(
  day: ScheduleDayBase,
  profile: Profile,
  label: Exclude<SplitLabel, "Rest">,
  workout: Workout | undefined,
): WeeklyScheduleDay {
  const duration = profile.sessionMinutes;
  const caloriesPerMin = workout ? workout.calories / workout.duration : 7;
  const exercises =
    workout?.exercises.map((exercise) => exercise.name) ??
    EXERCISE_POOLS[profile.equipment][exercisePoolLabel(label)] ??
    [];
  return {
    ...day,
    splitLabel: label,
    workoutId: workout?.id,
    workoutTitle: workout?.title ?? label,
    focus: focusFor(label),
    duration,
    difficulty: difficultyFor(profile.experience),
    equipment: EQUIPMENT_LABEL[profile.equipment],
    estimatedCalories: Math.round(caloriesPerMin * duration),
    exercises: exercises.slice(0, 5),
    isRestDay: false,
  };
}

export const weeklyScheduleService = {
  generateSchedule(
    profile: Profile,
    activePlan: string[] | ScheduledPlan = [],
    referenceDate: Date = new Date(),
  ): WeeklyScheduleDay[] {
    const monday = mondayFor(referenceDate);
    const scheduleWeekStart = localDateISO(monday);
    const completion = loadCompletion();
    const splitId = profile.workoutSplit ?? "auto";
    const savedIds = Array.isArray(activePlan) ? activePlan : activePlan.workoutIds;
    // With no saved plan for the current profile, follow the program onboarding would build.
    const planWorkouts = (savedIds.length ? savedIds : programForProfile(profile))
      .map(getWorkout)
      .filter((workout): workout is Workout => Boolean(workout));
    // A Smart Split plan is the member's program: its sessions run in order,
    // starting on the day the plan was made.
    const programSessions = splitId === "auto" ? planWorkouts.filter(isProgramWorkout) : [];
    const programStart =
      (Array.isArray(activePlan) ? null : parseDate(activePlan.createdAt)) ??
      parseDate(profile.completedAt) ??
      monday;
    const split =
      splitId === "auto" ? null : buildWeeklySplit(splitId, profile.daysPerWeek, scheduleWeekStart);
    const ranked = workoutRecommendationService.recommend(profile, 500);

    return DAY_NAMES.map((dayName, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateISO = localDateISO(date);
      const id = `${scheduleWeekStart}-${i}`;
      const day: ScheduleDayBase = {
        id,
        dayName,
        dateISO,
        isToday: dateISO === localDateISO(new Date()),
        isCompleted: completion.weekStartISO === scheduleWeekStart && !!completion.completed[id],
      };
      const daysSinceStart = daysBetween(programStart, date);

      if (programSessions.length) {
        const session = programSessionFor(daysSinceStart, profile.daysPerWeek, programSessions);
        return session
          ? trainingDay(day, profile, splitLabelForWorkout(session), session)
          : restDay(day);
      }

      const label = split
        ? split[i]
        : AUTO_SPLITS[profile.daysPerWeek][((daysSinceStart % 7) + 7) % 7];
      if (label === "Rest") return restDay(day);

      const savedPlanWorkout = planWorkouts.find((workout) =>
        workoutFitsScheduledSplit(label, workout),
      );
      const matchedWorkoutId = matchWorkoutId(label, ranked);
      return trainingDay(
        day,
        profile,
        label,
        savedPlanWorkout ?? ranked.find((workout) => workout.id === matchedWorkoutId),
      );
    });
  },

  generateMonthSchedule(
    profile: Profile,
    month: Date,
    activePlan: string[] | ScheduledPlan = [],
  ): WeeklyScheduleDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const firstMonday = mondayFor(firstDay);
    const lastMonday = mondayFor(lastDay);
    const schedule: WeeklyScheduleDay[] = [];

    for (let weekStart = firstMonday; weekStart <= lastMonday; ) {
      schedule.push(...weeklyScheduleService.generateSchedule(profile, activePlan, weekStart));
      const nextWeek = new Date(weekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      weekStart = nextWeek;
    }

    return schedule;
  },
};
