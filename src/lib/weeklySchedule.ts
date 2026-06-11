import type { Profile, EquipmentSetup, ExperienceLevel } from "./profile";
import { workouts, type Workout, type Difficulty } from "./workouts";

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

const SPLITS: Record<2 | 3 | 4 | 5 | 6, SplitLabel[]> = {
  2: ["Full Body Strength", "Rest", "Full Body Conditioning", "Rest", "Rest", "Rest", "Rest"],
  3: ["Push Day", "Rest", "Pull Day", "Rest", "Leg Day", "Rest", "Rest"],
  4: ["Upper Body", "Rest", "Lower Body", "Rest", "Push Day", "Pull + Core", "Rest"],
  5: ["Push Day", "Pull Day", "Leg Day", "Rest", "Upper Body", "Conditioning / Core", "Rest"],
  6: ["Push Day", "Pull Day", "Leg Day", "Rest", "Push Day", "Pull Day", "Leg Day"],
};

// Equipment-specific exercise pools per split label
const EXERCISE_POOLS: Record<EquipmentSetup, Record<Exclude<SplitLabel, "Rest">, string[]>> = {
  gym: {
    "Push Day": ["Bench Press", "Shoulder Press", "Incline DB Press", "Triceps Pushdown", "Lateral Raise"],
    "Pull Day": ["Lat Pulldown", "Cable Row", "Barbell Row", "Face Pull", "Bicep Curl"],
    "Leg Day": ["Barbell Squat", "Leg Press", "Romanian Deadlift", "Hamstring Curl", "Calf Raise"],
    "Upper Body": ["Bench Press", "Lat Pulldown", "Shoulder Press", "Cable Row", "Bicep Curl"],
    "Lower Body": ["Barbell Squat", "Leg Press", "Hamstring Curl", "Walking Lunge", "Calf Raise"],
    "Full Body Strength": ["Barbell Squat", "Bench Press", "Cable Row", "Shoulder Press", "Plank"],
    "Full Body Conditioning": ["Kettlebell Swing", "Goblet Squat", "Push Press", "Row Erg", "Burpees"],
    "Pull + Core": ["Lat Pulldown", "Cable Row", "Face Pull", "Cable Crunch", "Hanging Leg Raise"],
    "Conditioning / Core": ["Assault Bike", "Kettlebell Swing", "Cable Crunch", "Plank", "Mountain Climbers"],
  },
  dumbbells: {
    "Push Day": ["DB Bench Press", "DB Shoulder Press", "Incline DB Press", "Skullcrusher", "DB Lateral Raise"],
    "Pull Day": ["DB Row", "Renegade Row", "Reverse Fly", "Hammer Curl", "DB Curl"],
    "Leg Day": ["Goblet Squat", "DB Romanian Deadlift", "DB Lunge", "DB Step Up", "Calf Raise"],
    "Upper Body": ["DB Bench", "DB Row", "DB Shoulder Press", "Hammer Curl", "Skullcrusher"],
    "Lower Body": ["Goblet Squat", "DB RDL", "DB Lunge", "Glute Bridge", "Calf Raise"],
    "Full Body Strength": ["Goblet Squat", "DB Bench", "DB Row", "DB Press", "Plank"],
    "Full Body Conditioning": ["DB Thruster", "DB Swing", "Renegade Row", "DB Lunge", "Burpees"],
    "Pull + Core": ["DB Row", "Reverse Fly", "Hammer Curl", "Plank", "Russian Twist"],
    "Conditioning / Core": ["DB Thruster", "Burpees", "Mountain Climbers", "Plank", "Russian Twist"],
  },
  none: {
    "Push Day": ["Push Ups", "Pike Push Ups", "Decline Push Ups", "Diamond Push Ups", "Triceps Dips"],
    "Pull Day": ["Pull Ups", "Inverted Row", "Doorway Row", "Superman", "Reverse Snow Angels"],
    "Leg Day": ["Bodyweight Squat", "Reverse Lunge", "Glute Bridge", "Bulgarian Split Squat", "Calf Raise"],
    "Upper Body": ["Push Ups", "Pull Ups", "Pike Push Ups", "Inverted Row", "Triceps Dips"],
    "Lower Body": ["Squat", "Lunge", "Glute Bridge", "Step Up", "Wall Sit"],
    "Full Body Strength": ["Squat", "Push Ups", "Inverted Row", "Glute Bridge", "Plank"],
    "Full Body Conditioning": ["Burpees", "Jump Squats", "Mountain Climbers", "Push Ups", "High Knees"],
    "Pull + Core": ["Pull Ups", "Superman", "Plank", "Hollow Hold", "Leg Raise"],
    "Conditioning / Core": ["Burpees", "Mountain Climbers", "Plank", "Russian Twist", "Jumping Jacks"],
  },
  mixed: {} as Record<Exclude<SplitLabel, "Rest">, string[]>,
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
    case "Push Day": return "Chest · Shoulders · Triceps";
    case "Pull Day": return "Back · Biceps · Rear Delts";
    case "Leg Day": return "Quads · Hamstrings · Glutes";
    case "Upper Body": return "Chest · Back · Shoulders · Arms";
    case "Lower Body": return "Quads · Glutes · Hamstrings";
    case "Full Body Strength": return "Full Body · Compound Lifts";
    case "Full Body Conditioning": return "Full Body · Cardio";
    case "Pull + Core": return "Back · Core";
    case "Conditioning / Core": return "Cardio · Core";
    case "Rest": return "Recovery";
  }
}

function matchWorkoutId(label: SplitLabel, profile: Profile): string | undefined {
  const eq = profile.equipment;
  const ok = (w: Workout) => eq === "mixed" || w.equipment.includes(eq);
  const pick = (fn: (w: Workout) => boolean) => workouts.find((w) => ok(w) && fn(w))?.id;
  switch (label) {
    case "Push Day": return pick((w) => w.targetMuscles.includes("chest"));
    case "Pull Day": return pick((w) => w.targetMuscles.includes("back"));
    case "Leg Day": return pick((w) => w.targetMuscles.includes("legs") || w.targetMuscles.includes("glutes"));
    case "Upper Body": return pick((w) => w.id === "upper-body-strength") ?? pick((w) => w.targetMuscles.includes("chest"));
    case "Lower Body": return pick((w) => w.id === "lower-body-burn") ?? pick((w) => w.targetMuscles.includes("legs"));
    case "Full Body Strength": return pick((w) => w.id === "dumbbell-builder" || w.id === "bodyweight-starter") ?? pick(() => true);
    case "Full Body Conditioning": return pick((w) => w.id === "full-body-sweat") ?? pick((w) => w.category === "HIIT");
    case "Pull + Core": return pick((w) => w.targetMuscles.includes("back")) ?? pick((w) => w.category === "Core");
    case "Conditioning / Core": return pick((w) => w.category === "HIIT" || w.category === "Cardio");
    default: return undefined;
  }
}

function difficultyFor(level: ExperienceLevel): Difficulty {
  return level === "beginner" ? "Beginner" : level === "advanced" ? "Advanced" : "Intermediate";
}

function todayMondayIndex(): number {
  // Mon=0..Sun=6
  const d = new Date().getDay(); // Sun=0..Sat=6
  return (d + 6) % 7;
}

function weekStartISO(): string {
  const now = new Date();
  const diff = todayMondayIndex();
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
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
  } catch {}
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
  generateSchedule(profile: Profile): WeeklyScheduleDay[] {
    const split = SPLITS[profile.daysPerWeek];
    const todayIdx = todayMondayIndex();
    const monday = new Date();
    monday.setDate(monday.getDate() - todayIdx);
    const completion = loadCompletion();
    const pool = EXERCISE_POOLS[profile.equipment];

    return split.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateISO = date.toISOString().slice(0, 10);
      const id = `${completion.weekStartISO}-${i}`;
      const isToday = i === todayIdx;
      const isCompleted = !!completion.completed[id];

      if (label === "Rest") {
        return {
          id, dayName: DAY_NAMES[i], dateISO, splitLabel: label,
          workoutTitle: "Rest & Recovery",
          focus: "Recovery",
          duration: 0, difficulty: "Beginner" as Difficulty,
          equipment: "—", estimatedCalories: 0,
          exercises: [], isRestDay: true, isToday, isCompleted,
        };
      }

      const workoutId = matchWorkoutId(label, profile);
      const w = workoutId ? workouts.find((x) => x.id === workoutId) : undefined;
      const exercises = pool[label] ?? w?.exercises.map((e) => e.name) ?? [];
      const duration = profile.sessionMinutes;
      const difficulty = difficultyFor(profile.experience);
      const caloriesPerMin = w ? w.calories / w.duration : 7;
      const estimatedCalories = Math.round(caloriesPerMin * duration);

      return {
        id, dayName: DAY_NAMES[i], dateISO, splitLabel: label,
        workoutId,
        workoutTitle: label,
        focus: focusFor(label),
        duration, difficulty,
        equipment: EQUIPMENT_LABEL[profile.equipment],
        estimatedCalories,
        exercises: exercises.slice(0, 5),
        isRestDay: false, isToday, isCompleted,
      };
    });
  },
};
