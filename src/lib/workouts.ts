import {
  getProfileGoals,
  type Goal,
  type ExperienceLevel,
  type EquipmentSetup,
  type FocusArea,
  type Profile,
} from "./profile";
import imgLowerBodyBurn from "@/assets/workouts/covers/sora-lower-strength-v2.png";
import imgPushStrength from "@/assets/workouts/covers/sora-upper-strength-v2.png";
import imgPullStrength from "@/assets/workouts/covers/sora-upper-strength-v2.png";
import imgFullBodySweat from "@/assets/workouts/covers/sora-hiit-conditioning-v2.png";
import imgDumbbellBuilder from "@/assets/workouts/covers/sora-upper-strength-v2.png";
import imgCoreCrusher from "@/assets/workouts/covers/sora-core-v2.png";
import imgFatLossHiit from "@/assets/workouts/covers/sora-hiit-conditioning-v2.png";
import imgMobilityRecovery from "@/assets/workouts/covers/sora-mobility-v2.png";
import imgGluteBuilder from "@/assets/workouts/covers/sora-lower-strength-v2.png";
import imgUpperBodyStrength from "@/assets/workouts/covers/sora-upper-strength-v2.png";
import imgBodyweightStarter from "@/assets/workouts/bodyweight-starter.jpg";
import imgEnduranceRun from "@/assets/workouts/covers/sora-cardio-v2.png";
import { createGeneratedWorkoutCatalog, GENERATED_WORKOUT_COUNT } from "./workoutCatalog";

export type Category = "Strength" | "Cardio" | "HIIT" | "Mobility" | "Core";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  time?: string;
  rest: string;
  muscleGroup: string;
  difficulty: Difficulty;
  demoType: string; // animation key
}

export interface Workout {
  id: string;
  title: string;
  category: Category;
  description: string;
  duration: number; // minutes
  calories: number;
  difficulty: Difficulty;
  equipment: EquipmentSetup[]; // which setups this works for
  targetMuscles: FocusArea[];
  exercises: Exercise[];
  thumbnail: { from: string; to: string; emoji: string };
  image?: string;
  recommendedForGoals: Goal[];
  recommendedForLevels: ExperienceLevel[];
  imagePosition?: string;
}

// Legacy alias so older code (workout detail) keeps compiling.
export type WorkoutLegacy = Workout & {
  minutes: number;
  kcal: number;
  level: Difficulty;
  rounds: { name: string; duration: string }[];
};

const ex = (
  id: string,
  name: string,
  sets: number,
  repsOrTime: { reps?: string; time?: string },
  rest: string,
  muscleGroup: string,
  difficulty: Difficulty,
  demoType = "generic",
): Exercise => ({ id, name, sets, ...repsOrTime, rest, muscleGroup, difficulty, demoType });

const featuredWorkouts: Workout[] = [
  {
    id: "lower-body-burn",
    title: "Lower Body Burn",
    category: "Strength",
    description:
      "Sculpt legs and glutes with a focused circuit hitting quads, hamstrings, and posterior chain.",
    duration: 30,
    calories: 280,
    difficulty: "Intermediate",
    equipment: ["none", "dumbbells", "mixed"],
    targetMuscles: ["legs", "glutes"],
    thumbnail: { from: "oklch(0.65 0.2 25)", to: "oklch(0.4 0.18 15)", emoji: "🔥" },
    image: imgLowerBodyBurn,
    recommendedForGoals: ["lose_weight", "build_muscle", "recomp"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex("squat", "Goblet Squat", 4, { reps: "10-12" }, "60s", "Quads", "Intermediate", "squat"),
      ex(
        "rdl",
        "Romanian Deadlift",
        3,
        { reps: "10" },
        "75s",
        "Hamstrings",
        "Intermediate",
        "hinge",
      ),
      ex(
        "lunge",
        "Reverse Lunge",
        3,
        { reps: "10/side" },
        "45s",
        "Glutes",
        "Intermediate",
        "lunge",
      ),
      ex("bridge", "Glute Bridge", 3, { reps: "15" }, "45s", "Glutes", "Beginner", "bridge"),
      ex("wall-sit", "Wall Sit", 3, { time: "45s" }, "30s", "Quads", "Beginner", "hold"),
    ],
  },
  {
    id: "push-strength",
    title: "Push Strength",
    category: "Strength",
    description: "Heavy compound presses to grow chest, shoulders, and triceps.",
    duration: 45,
    calories: 320,
    difficulty: "Intermediate",
    equipment: ["gym", "dumbbells", "mixed"],
    targetMuscles: ["chest", "arms"],
    thumbnail: { from: "oklch(0.62 0.18 250)", to: "oklch(0.32 0.12 260)", emoji: "💪" },
    image: imgPushStrength,
    recommendedForGoals: ["build_muscle", "recomp", "maintain"],
    recommendedForLevels: ["intermediate", "advanced"],
    exercises: [
      ex("bench", "Bench Press", 4, { reps: "6-8" }, "120s", "Chest", "Advanced", "press"),
      ex("ohp", "Overhead Press", 4, { reps: "8" }, "90s", "Shoulders", "Advanced", "press"),
      ex(
        "incline-db",
        "Incline DB Press",
        3,
        { reps: "10" },
        "75s",
        "Upper chest",
        "Intermediate",
        "press",
      ),
      ex("dips", "Triceps Dips", 3, { reps: "10-12" }, "60s", "Triceps", "Intermediate", "dips"),
      ex("lateral", "Lateral Raise", 3, { reps: "12-15" }, "45s", "Shoulders", "Beginner", "raise"),
    ],
  },
  {
    id: "pull-strength",
    title: "Pull Strength",
    category: "Strength",
    description: "Build a wide back and strong biceps with rows, pulldowns, and curls.",
    duration: 45,
    calories: 310,
    difficulty: "Intermediate",
    equipment: ["gym", "dumbbells", "mixed"],
    targetMuscles: ["back", "arms"],
    thumbnail: { from: "oklch(0.6 0.18 290)", to: "oklch(0.3 0.12 290)", emoji: "🎯" },
    image: imgPullStrength,
    recommendedForGoals: ["build_muscle", "recomp", "maintain"],
    recommendedForLevels: ["intermediate", "advanced"],
    exercises: [
      ex("pullup", "Pull Ups", 4, { reps: "6-10" }, "120s", "Lats", "Advanced", "pull"),
      ex("row", "Bent-Over Row", 4, { reps: "8" }, "90s", "Mid back", "Intermediate", "row"),
      ex("ld", "Lat Pulldown", 3, { reps: "10-12" }, "60s", "Lats", "Beginner", "pull"),
      ex("face-pull", "Face Pull", 3, { reps: "15" }, "45s", "Rear delts", "Beginner", "pull"),
      ex("curl", "DB Curl", 3, { reps: "10-12" }, "45s", "Biceps", "Beginner", "curl"),
    ],
  },
  {
    id: "full-body-sweat",
    title: "Full Body Sweat",
    category: "HIIT",
    description: "A no-equipment circuit that hits every major muscle and spikes your heart rate.",
    duration: 20,
    calories: 240,
    difficulty: "Beginner",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["cardio", "legs", "chest", "core"],
    thumbnail: { from: "oklch(0.78 0.18 80)", to: "oklch(0.45 0.16 30)", emoji: "💦" },
    image: imgFullBodySweat,
    recommendedForGoals: ["lose_weight", "endurance", "maintain"],
    recommendedForLevels: ["beginner", "intermediate"],
    exercises: [
      ex("jj", "Jumping Jacks", 3, { time: "45s" }, "15s", "Full body", "Beginner", "jump"),
      ex("pu", "Push Ups", 3, { reps: "10-15" }, "30s", "Chest", "Beginner", "pushup"),
      ex("bw-squat", "Bodyweight Squat", 3, { reps: "20" }, "30s", "Legs", "Beginner", "squat"),
      ex("mc", "Mountain Climbers", 3, { time: "40s" }, "20s", "Core", "Beginner", "climb"),
      ex("plank", "Plank", 3, { time: "45s" }, "30s", "Core", "Beginner", "hold"),
    ],
  },
  {
    id: "dumbbell-builder",
    title: "Dumbbell Muscle Builder",
    category: "Strength",
    description: "A complete dumbbell-only session that builds size across the whole upper body.",
    duration: 45,
    calories: 300,
    difficulty: "Intermediate",
    equipment: ["dumbbells", "gym", "mixed"],
    targetMuscles: ["chest", "back", "arms", "core"],
    thumbnail: { from: "oklch(0.65 0.2 130)", to: "oklch(0.35 0.15 150)", emoji: "🏋️" },
    image: imgDumbbellBuilder,
    recommendedForGoals: ["build_muscle", "recomp"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex("db-press", "DB Bench Press", 4, { reps: "10" }, "75s", "Chest", "Intermediate", "press"),
      ex(
        "db-row",
        "Single-Arm DB Row",
        4,
        { reps: "10/side" },
        "60s",
        "Back",
        "Intermediate",
        "row",
      ),
      ex(
        "db-ohp",
        "DB Shoulder Press",
        3,
        { reps: "10" },
        "60s",
        "Shoulders",
        "Intermediate",
        "press",
      ),
      ex("hammer", "Hammer Curl", 3, { reps: "12" }, "45s", "Biceps", "Beginner", "curl"),
      ex("sk", "Skullcrusher", 3, { reps: "12" }, "45s", "Triceps", "Intermediate", "press"),
    ],
  },
  {
    id: "core-crusher",
    title: "Core Crusher",
    category: "Core",
    description: "Slow, controlled core work for stability, posture, and visible abs.",
    duration: 20,
    calories: 130,
    difficulty: "Beginner",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["core"],
    thumbnail: { from: "oklch(0.7 0.16 190)", to: "oklch(0.32 0.12 220)", emoji: "🧱" },
    image: imgCoreCrusher,
    recommendedForGoals: ["lose_weight", "build_muscle", "recomp", "maintain"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex("deadbug", "Dead Bug", 3, { reps: "10/side" }, "30s", "Core", "Beginner", "hold"),
      ex("plank-c", "Plank", 3, { time: "60s" }, "30s", "Core", "Beginner", "hold"),
      ex("bird-dog", "Bird Dog", 3, { reps: "10/side" }, "30s", "Lower back", "Beginner", "hold"),
      ex("hollow", "Hollow Body Hold", 3, { time: "30s" }, "45s", "Abs", "Intermediate", "hold"),
      ex("russian", "Russian Twist", 3, { reps: "20" }, "30s", "Obliques", "Beginner", "twist"),
    ],
  },
  {
    id: "fat-loss-hiit",
    title: "Fat Loss HIIT",
    category: "HIIT",
    description: "Maximum-effort intervals to spike your heart rate and torch calories long after.",
    duration: 30,
    calories: 380,
    difficulty: "Advanced",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["cardio", "legs", "core"],
    thumbnail: { from: "oklch(0.7 0.22 40)", to: "oklch(0.35 0.2 10)", emoji: "⚡" },
    image: imgFatLossHiit,
    recommendedForGoals: ["lose_weight", "endurance"],
    recommendedForLevels: ["intermediate", "advanced"],
    exercises: [
      ex("burpees", "Burpees", 5, { time: "30s" }, "30s", "Full body", "Advanced", "jump"),
      ex(
        "kbs",
        "Kettlebell Swings",
        5,
        { time: "30s" },
        "30s",
        "Posterior",
        "Intermediate",
        "hinge",
      ),
      ex("hk", "High Knees", 5, { time: "30s" }, "30s", "Cardio", "Beginner", "run"),
      ex("jacks", "Plank Jacks", 5, { time: "30s" }, "30s", "Core", "Intermediate", "jump"),
    ],
  },
  {
    id: "mobility-recovery",
    title: "Mobility Recovery",
    category: "Mobility",
    description: "Open hips, shoulders, and thoracic spine. Use as a primer or active recovery.",
    duration: 20,
    calories: 70,
    difficulty: "Beginner",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["mobility"],
    thumbnail: { from: "oklch(0.72 0.14 200)", to: "oklch(0.3 0.1 270)", emoji: "🧘" },
    image: imgMobilityRecovery,
    recommendedForGoals: ["recomp", "maintain", "endurance", "build_muscle", "lose_weight"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex(
        "wgs",
        "World's Greatest Stretch",
        2,
        { time: "60s/side" },
        "20s",
        "Hips",
        "Beginner",
        "stretch",
      ),
      ex("cc", "Cat-Cow", 2, { time: "60s" }, "20s", "Spine", "Beginner", "stretch"),
      ex(
        "hipswitch",
        "90/90 Hip Switch",
        2,
        { reps: "10/side" },
        "20s",
        "Hips",
        "Beginner",
        "stretch",
      ),
      ex(
        "shoulder",
        "Shoulder Pass-Through",
        2,
        { reps: "15" },
        "20s",
        "Shoulders",
        "Beginner",
        "stretch",
      ),
    ],
  },
  {
    id: "glute-builder",
    title: "Glute Builder",
    category: "Strength",
    description: "Hip-dominant exercises to grow and strengthen the glutes.",
    duration: 45,
    calories: 290,
    difficulty: "Intermediate",
    equipment: ["dumbbells", "gym", "none", "mixed"],
    targetMuscles: ["glutes", "legs"],
    thumbnail: { from: "oklch(0.7 0.2 340)", to: "oklch(0.34 0.16 340)", emoji: "🍑" },
    image: imgGluteBuilder,
    recommendedForGoals: ["build_muscle", "recomp"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex("hipthrust", "Hip Thrust", 4, { reps: "10" }, "90s", "Glutes", "Intermediate", "bridge"),
      ex(
        "bss",
        "Bulgarian Split Squat",
        3,
        { reps: "10/side" },
        "75s",
        "Glutes",
        "Advanced",
        "lunge",
      ),
      ex(
        "rdl-g",
        "Romanian Deadlift",
        4,
        { reps: "10" },
        "75s",
        "Hamstrings",
        "Intermediate",
        "hinge",
      ),
      ex("step-up", "Step Up", 3, { reps: "12/side" }, "45s", "Glutes", "Beginner", "step"),
      ex("kickback", "Cable Kickback", 3, { reps: "15/side" }, "30s", "Glutes", "Beginner", "kick"),
    ],
  },
  {
    id: "upper-body-strength",
    title: "Upper Body Strength",
    category: "Strength",
    description: "A high-volume upper-body push & pull session to build complete strength.",
    duration: 60,
    calories: 410,
    difficulty: "Advanced",
    equipment: ["gym", "dumbbells", "mixed"],
    targetMuscles: ["chest", "back", "arms"],
    thumbnail: { from: "oklch(0.6 0.18 60)", to: "oklch(0.28 0.1 50)", emoji: "🛡️" },
    image: imgUpperBodyStrength,
    recommendedForGoals: ["build_muscle", "recomp"],
    recommendedForLevels: ["advanced", "intermediate"],
    exercises: [
      ex("bench-u", "Bench Press", 5, { reps: "5" }, "150s", "Chest", "Advanced", "press"),
      ex("pull-u", "Weighted Pull Ups", 4, { reps: "6" }, "120s", "Lats", "Advanced", "pull"),
      ex("ohp-u", "Standing OHP", 4, { reps: "6-8" }, "120s", "Shoulders", "Advanced", "press"),
      ex("row-u", "Pendlay Row", 4, { reps: "6" }, "90s", "Back", "Advanced", "row"),
      ex(
        "close-grip",
        "Close-Grip Bench",
        3,
        { reps: "8" },
        "75s",
        "Triceps",
        "Intermediate",
        "press",
      ),
    ],
  },
  {
    id: "bodyweight-starter",
    title: "Bodyweight Starter",
    category: "Strength",
    description: "A beginner-friendly full-body session you can do anywhere, with zero equipment.",
    duration: 20,
    calories: 160,
    difficulty: "Beginner",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["legs", "chest", "core"],
    thumbnail: { from: "oklch(0.78 0.16 140)", to: "oklch(0.35 0.13 160)", emoji: "🌱" },
    image: imgBodyweightStarter,
    recommendedForGoals: ["maintain", "lose_weight", "build_muscle", "endurance"],
    recommendedForLevels: ["beginner"],
    exercises: [
      ex("incline-pu", "Incline Push Ups", 3, { reps: "10" }, "45s", "Chest", "Beginner", "pushup"),
      ex("air-squat", "Air Squat", 3, { reps: "15" }, "45s", "Legs", "Beginner", "squat"),
      ex("glute-b", "Glute Bridge", 3, { reps: "12" }, "30s", "Glutes", "Beginner", "bridge"),
      ex("plank-b", "Plank", 3, { time: "30s" }, "30s", "Core", "Beginner", "hold"),
    ],
  },
  {
    id: "endurance-run",
    title: "Endurance Conditioning",
    category: "Cardio",
    description: "Steady-state work with intervals to build aerobic capacity and stamina.",
    duration: 45,
    calories: 420,
    difficulty: "Intermediate",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    targetMuscles: ["cardio", "legs"],
    thumbnail: { from: "oklch(0.7 0.18 170)", to: "oklch(0.3 0.12 200)", emoji: "🏃" },
    image: imgEnduranceRun,
    recommendedForGoals: ["endurance", "lose_weight"],
    recommendedForLevels: ["beginner", "intermediate", "advanced"],
    exercises: [
      ex("warm", "Easy Jog Warm-Up", 1, { time: "5 min" }, "—", "Cardio", "Beginner", "run"),
      ex(
        "intervals",
        "Tempo Intervals",
        6,
        { time: "3 min" },
        "90s",
        "Cardio",
        "Intermediate",
        "run",
      ),
      ex("cool", "Cool Down Walk", 1, { time: "5 min" }, "—", "Cardio", "Beginner", "run"),
    ],
  },
];

const generatedWorkouts = createGeneratedWorkoutCatalog();
export const workouts: Workout[] = [...featuredWorkouts, ...generatedWorkouts];
export const workoutCatalogSize = GENERATED_WORKOUT_COUNT + featuredWorkouts.length;
const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));

export const getWorkout = (id: string): Workout | undefined => workoutById.get(id);

// -------- Recommendation service --------

export interface WeeklyPlanDay {
  day: string;
  label: string; // e.g. "Push Day" or "Rest"
  workoutId: string | null;
}

const SPLITS: Record<number, string[]> = {
  2: ["Full Body A", "Rest", "Full Body B", "Rest", "Rest", "Active Recovery", "Rest"],
  3: ["Push", "Rest", "Pull", "Rest", "Legs", "Rest", "Rest"],
  4: ["Upper", "Lower", "Rest", "Upper", "Lower", "Rest", "Rest"],
  5: ["Push", "Pull", "Legs", "Upper", "Conditioning", "Rest", "Rest"],
  6: ["Push", "Pull", "Legs", "Upper", "Lower", "Conditioning", "Rest"],
};

function dayToWorkoutId(label: string, profile: Profile): string | null {
  const available = workouts.filter((w) => matchesEquipment(w, profile.equipment));
  const pick = (filterFn: (w: Workout) => boolean) => available.find(filterFn)?.id ?? null;

  switch (label) {
    case "Push":
      return pick((w) => w.targetMuscles.includes("chest"));
    case "Pull":
      return pick((w) => w.targetMuscles.includes("back"));
    case "Legs":
      return pick((w) => w.targetMuscles.includes("legs") || w.targetMuscles.includes("glutes"));
    case "Upper":
      return pick((w) => w.id === "upper-body-strength" || w.targetMuscles.includes("chest"));
    case "Lower":
      return pick((w) => w.id === "lower-body-burn" || w.targetMuscles.includes("legs"));
    case "Full Body A":
      return pick((w) => w.id === "full-body-sweat" || w.id === "bodyweight-starter");
    case "Full Body B":
      return pick((w) => w.id === "dumbbell-builder" || w.id === "bodyweight-starter");
    case "Conditioning":
      return pick((w) => w.category === "HIIT" || w.category === "Cardio");
    case "Active Recovery":
      return pick((w) => w.category === "Mobility");
    default:
      return null;
  }
}

function matchesEquipment(w: Workout, setup: EquipmentSetup): boolean {
  if (setup === "mixed") return true;
  return w.equipment.includes(setup);
}

function matchesExperience(w: Workout, level: ExperienceLevel): boolean {
  return w.recommendedForLevels.includes(level);
}

export const workoutRecommendationService = {
  /** Score-ranked personalized list. */
  recommend(profile: Profile, limit = 8): Workout[] {
    const ranked = workouts
      .map((w) => ({ w, score: scoreWorkout(w, profile) }))
      .filter(
        ({ w, score }) =>
          score > -100 &&
          matchesEquipment(w, profile.equipment) &&
          matchesExperience(w, profile.experience),
      )
      .sort((a, b) => b.score - a.score);

    return diversifyRankedWorkouts(ranked, limit);
  },

  filterByCategory(profile: Profile, category: Category | "All" | "Recommended"): Workout[] {
    if (category === "Recommended") return this.recommend(profile, 12);
    const ranked = workouts
      .filter(
        (w) => matchesEquipment(w, profile.equipment) && matchesExperience(w, profile.experience),
      )
      .map((w) => ({ w, score: scoreWorkout(w, profile) }))
      .sort((a, b) => b.score - a.score);
    const available = diversifyRankedWorkouts(ranked);
    if (category === "All") return available;
    return available.filter((w) => w.category === category);
  },

  weeklyPlan(profile: Profile): WeeklyPlanDay[] {
    const split = SPLITS[profile.daysPerWeek] ?? SPLITS[4];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return split.map((label, i) => ({
      day: days[i],
      label,
      workoutId: label === "Rest" ? null : dayToWorkoutId(label, profile),
    }));
  },
};

/**
 * Keep relevance ordering while preventing one cover/workout family from
 * filling an entire screen. A three-card memory gives the feed a varied rhythm
 * without making recommendations feel random.
 */
function diversifyRankedWorkouts(
  items: Array<{ w: Workout; score: number }>,
  limit = items.length,
): Workout[] {
  const pool = [...items];
  const result: Workout[] = [];

  while (pool.length > 0 && result.length < limit) {
    const recentCovers = new Set(
      result.slice(-3).map((workout) => workout.image ?? workout.category),
    );
    const variedIndex = pool.findIndex(({ w }) => !recentCovers.has(w.image ?? w.category));
    const [next] = pool.splice(variedIndex >= 0 ? variedIndex : 0, 1);
    result.push(next.w);
  }

  return result;
}

function scoreWorkout(w: Workout, p: Profile): number {
  let s = 0;
  // Hard requirement: equipment must match
  if (!matchesEquipment(w, p.equipment)) s -= 1000;
  // Goal match
  const selectedGoals = getProfileGoals(p);
  const matchedGoals = selectedGoals.filter((goal) => w.recommendedForGoals.includes(goal));
  s += matchedGoals.length * 24;
  if (w.recommendedForGoals.includes(p.goal)) s += 6;
  // Experience match
  if (w.recommendedForLevels.includes(p.experience)) s += 20;
  else if (
    (p.experience === "beginner" && w.difficulty === "Advanced") ||
    (p.experience === "advanced" && w.difficulty === "Beginner")
  )
    s -= 15;
  // Focus area overlap
  const overlap = w.targetMuscles.filter((m) => p.focusAreas.includes(m)).length;
  s += overlap * 10;
  // Duration match to session length
  const diff = Math.abs(w.duration - p.sessionMinutes);
  s += Math.max(0, 15 - diff / 2);
  // Stable profile-specific variety keeps equally matched users from seeing
  // an identical order while preserving the same catalog across reloads.
  const fingerprint = `${p.name}|${p.completedAt}|${selectedGoals.join(",")}|${p.experience}|${p.equipment}`;
  let variety = 2166136261;
  const varietyText = `${fingerprint}|${w.id}`;
  for (let index = 0; index < varietyText.length; index += 1) {
    variety ^= varietyText.charCodeAt(index);
    variety = Math.imul(variety, 16777619);
  }
  s += ((variety >>> 0) % 1000) / 1000;
  return s;
}
