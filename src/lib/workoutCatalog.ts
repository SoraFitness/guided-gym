import type { Category, Difficulty, Exercise, Workout } from "./workouts";
import type { EquipmentSetup, ExperienceLevel, FocusArea, Goal } from "./profile";
import imgUpperStrength from "@/assets/workouts/covers/sora-upper-strength-v2.png";
import imgLowerStrength from "@/assets/workouts/covers/sora-lower-strength-v2.png";
import imgHiitConditioning from "@/assets/workouts/covers/sora-hiit-conditioning-v2.png";
import imgMobility from "@/assets/workouts/covers/sora-mobility-v2.png";
import imgCore from "@/assets/workouts/covers/sora-core-v2.png";
import imgCardio from "@/assets/workouts/covers/sora-cardio-v2.png";

type BlueprintId =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full"
  | "glutes"
  | "core"
  | "hiit"
  | "cardio"
  | "mobility"
  | "athletic";

interface Blueprint {
  id: BlueprintId;
  name: string;
  category: Category;
  targetMuscles: FocusArea[];
  description: string;
  image: string;
  imagePosition?: string;
  thumbnail: Workout["thumbnail"];
}

interface ExerciseSeed {
  id: string;
  name: string;
  targets: FocusArea[];
  muscleGroup: string;
  equipment: EquipmentSetup[];
  categories: Category[];
  demoType: string;
  timed?: boolean;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  demoType: string;
  equipment: EquipmentSetup[];
  targets: FocusArea[];
  categories: Category[];
  timed: boolean;
  defaultSets: number;
  defaultReps: string;
  defaultRest: string;
}

const BLUEPRINTS: Blueprint[] = [
  {
    id: "push",
    name: "Push Strength",
    category: "Strength",
    targetMuscles: ["chest", "arms"],
    description: "Progressive pressing for chest, shoulders, and triceps.",
    image: imgUpperStrength,
    imagePosition: "50% 25%",
    thumbnail: { from: "oklch(0.61 0.18 250)", to: "oklch(0.28 0.11 265)", emoji: "P" },
  },
  {
    id: "pull",
    name: "Pull Strength",
    category: "Strength",
    targetMuscles: ["back", "arms"],
    description: "Rows, pulls, and curls for back width and pulling strength.",
    image: imgUpperStrength,
    imagePosition: "50% 28%",
    thumbnail: { from: "oklch(0.58 0.18 292)", to: "oklch(0.27 0.1 292)", emoji: "R" },
  },
  {
    id: "legs",
    name: "Leg Development",
    category: "Strength",
    targetMuscles: ["legs", "glutes"],
    description: "Balanced quad, hamstring, glute, and calf development.",
    image: imgLowerStrength,
    imagePosition: "50% 30%",
    thumbnail: { from: "oklch(0.65 0.2 25)", to: "oklch(0.35 0.16 15)", emoji: "L" },
  },
  {
    id: "upper",
    name: "Upper Body",
    category: "Strength",
    targetMuscles: ["chest", "back", "arms"],
    description: "Complete upper-body strength with balanced push and pull volume.",
    image: imgUpperStrength,
    imagePosition: "50% 22%",
    thumbnail: { from: "oklch(0.58 0.17 60)", to: "oklch(0.25 0.09 50)", emoji: "U" },
  },
  {
    id: "lower",
    name: "Lower Body",
    category: "Strength",
    targetMuscles: ["legs", "glutes", "core"],
    description: "Lower-body strength, stability, and posterior-chain work.",
    image: imgLowerStrength,
    imagePosition: "50% 35%",
    thumbnail: { from: "oklch(0.64 0.18 35)", to: "oklch(0.3 0.13 20)", emoji: "D" },
  },
  {
    id: "full",
    name: "Full Body Builder",
    category: "Strength",
    targetMuscles: ["chest", "back", "legs", "core"],
    description: "Efficient full-body training built around compound movement patterns.",
    image: imgUpperStrength,
    imagePosition: "50% 24%",
    thumbnail: { from: "oklch(0.64 0.19 130)", to: "oklch(0.31 0.13 150)", emoji: "F" },
  },
  {
    id: "glutes",
    name: "Glute Builder",
    category: "Strength",
    targetMuscles: ["glutes", "legs"],
    description: "Hip-dominant strength and hypertrophy for glutes and hamstrings.",
    image: imgLowerStrength,
    imagePosition: "50% 32%",
    thumbnail: { from: "oklch(0.67 0.2 340)", to: "oklch(0.31 0.14 340)", emoji: "G" },
  },
  {
    id: "core",
    name: "Core Control",
    category: "Core",
    targetMuscles: ["core"],
    description: "Controlled trunk training for stability, bracing, and posture.",
    image: imgCore,
    imagePosition: "50% 28%",
    thumbnail: { from: "oklch(0.68 0.15 190)", to: "oklch(0.29 0.1 220)", emoji: "C" },
  },
  {
    id: "hiit",
    name: "HIIT Conditioning",
    category: "HIIT",
    targetMuscles: ["cardio", "legs", "core"],
    description: "Short work intervals that build conditioning and total-body power.",
    image: imgHiitConditioning,
    imagePosition: "50% 30%",
    thumbnail: { from: "oklch(0.69 0.22 40)", to: "oklch(0.33 0.18 10)", emoji: "H" },
  },
  {
    id: "cardio",
    name: "Endurance",
    category: "Cardio",
    targetMuscles: ["cardio", "legs"],
    description: "Sustainable aerobic work with controlled progression and intervals.",
    image: imgCardio,
    imagePosition: "50% 28%",
    thumbnail: { from: "oklch(0.68 0.17 170)", to: "oklch(0.28 0.11 200)", emoji: "E" },
  },
  {
    id: "mobility",
    name: "Mobility Reset",
    category: "Mobility",
    targetMuscles: ["mobility", "core"],
    description: "A joint-friendly mobility sequence for recovery and movement quality.",
    image: imgMobility,
    imagePosition: "50% 30%",
    thumbnail: { from: "oklch(0.7 0.13 200)", to: "oklch(0.28 0.09 270)", emoji: "M" },
  },
  {
    id: "athletic",
    name: "Athletic Circuit",
    category: "HIIT",
    targetMuscles: ["cardio", "legs", "core", "chest"],
    description: "Athletic movement, strength endurance, and conditioning in one session.",
    image: imgHiitConditioning,
    imagePosition: "50% 28%",
    thumbnail: { from: "oklch(0.76 0.18 80)", to: "oklch(0.41 0.15 30)", emoji: "A" },
  },
];

const E: ExerciseSeed[] = [
  {
    id: "push-up",
    name: "Push Ups",
    targets: ["chest", "arms"],
    muscleGroup: "Chest",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "HIIT"],
    demoType: "pushup",
  },
  {
    id: "incline-push-up",
    name: "Incline Push Ups",
    targets: ["chest", "arms"],
    muscleGroup: "Chest",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "pushup",
  },
  {
    id: "diamond-push-up",
    name: "Diamond Push Ups",
    targets: ["chest", "arms"],
    muscleGroup: "Triceps",
    equipment: ["none", "mixed"],
    categories: ["Strength"],
    demoType: "pushup",
  },
  {
    id: "pike-push-up",
    name: "Pike Push Ups",
    targets: ["chest", "arms"],
    muscleGroup: "Shoulders",
    equipment: ["none", "mixed"],
    categories: ["Strength"],
    demoType: "pushup",
  },
  {
    id: "bench-press",
    name: "Bench Press",
    targets: ["chest", "arms"],
    muscleGroup: "Chest",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "incline-bench",
    name: "Incline Bench Press",
    targets: ["chest", "arms"],
    muscleGroup: "Upper chest",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "cable-fly",
    name: "Cable Fly",
    targets: ["chest"],
    muscleGroup: "Chest",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "fly",
  },
  {
    id: "db-bench",
    name: "Dumbbell Bench Press",
    targets: ["chest", "arms"],
    muscleGroup: "Chest",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "db-shoulder",
    name: "Dumbbell Shoulder Press",
    targets: ["chest", "arms"],
    muscleGroup: "Shoulders",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    targets: ["arms"],
    muscleGroup: "Shoulders",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "raise",
  },
  {
    id: "triceps-extension",
    name: "Triceps Extension",
    targets: ["arms"],
    muscleGroup: "Triceps",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "doorway-row",
    name: "Doorway Row",
    targets: ["back", "arms"],
    muscleGroup: "Back",
    equipment: ["none", "mixed"],
    categories: ["Strength"],
    demoType: "row",
  },
  {
    id: "superman",
    name: "Superman Hold",
    targets: ["back", "core"],
    muscleGroup: "Posterior chain",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "Core"],
    demoType: "hold",
    timed: true,
  },
  {
    id: "reverse-snow",
    name: "Reverse Snow Angels",
    targets: ["back"],
    muscleGroup: "Upper back",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "Mobility"],
    demoType: "raise",
  },
  {
    id: "db-row",
    name: "Single-Arm Dumbbell Row",
    targets: ["back", "arms"],
    muscleGroup: "Back",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "row",
  },
  {
    id: "chest-row",
    name: "Chest-Supported Row",
    targets: ["back", "arms"],
    muscleGroup: "Mid back",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "row",
  },
  {
    id: "hammer-curl",
    name: "Hammer Curl",
    targets: ["arms"],
    muscleGroup: "Biceps",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "curl",
  },
  {
    id: "barbell-row",
    name: "Barbell Row",
    targets: ["back", "arms"],
    muscleGroup: "Back",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "row",
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    targets: ["back", "arms"],
    muscleGroup: "Lats",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "pull",
  },
  {
    id: "cable-row",
    name: "Seated Cable Row",
    targets: ["back", "arms"],
    muscleGroup: "Mid back",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "row",
  },
  {
    id: "face-pull",
    name: "Face Pull",
    targets: ["back", "arms"],
    muscleGroup: "Rear delts",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "pull",
  },
  {
    id: "air-squat",
    name: "Air Squat",
    targets: ["legs", "glutes"],
    muscleGroup: "Quads",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "HIIT"],
    demoType: "squat",
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    targets: ["legs", "glutes"],
    muscleGroup: "Glutes",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "HIIT"],
    demoType: "lunge",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    targets: ["legs", "glutes", "core"],
    muscleGroup: "Glutes",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength", "Core"],
    demoType: "bridge",
  },
  {
    id: "split-squat",
    name: "Split Squat",
    targets: ["legs", "glutes"],
    muscleGroup: "Legs",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "lunge",
  },
  {
    id: "calf-raise",
    name: "Standing Calf Raise",
    targets: ["legs"],
    muscleGroup: "Calves",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "raise",
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    targets: ["legs", "glutes"],
    muscleGroup: "Quads",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength", "HIIT"],
    demoType: "squat",
  },
  {
    id: "db-rdl",
    name: "Dumbbell Romanian Deadlift",
    targets: ["legs", "glutes"],
    muscleGroup: "Hamstrings",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "hinge",
  },
  {
    id: "db-lunge",
    name: "Dumbbell Walking Lunge",
    targets: ["legs", "glutes"],
    muscleGroup: "Legs",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength", "HIIT"],
    demoType: "lunge",
  },
  {
    id: "step-up",
    name: "Step Up",
    targets: ["legs", "glutes"],
    muscleGroup: "Glutes",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "step",
  },
  {
    id: "hip-thrust",
    name: "Hip Thrust",
    targets: ["glutes", "legs"],
    muscleGroup: "Glutes",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["Strength"],
    demoType: "bridge",
  },
  {
    id: "barbell-squat",
    name: "Barbell Squat",
    targets: ["legs", "glutes"],
    muscleGroup: "Quads",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "squat",
  },
  {
    id: "leg-press",
    name: "Leg Press",
    targets: ["legs", "glutes"],
    muscleGroup: "Quads",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "press",
  },
  {
    id: "leg-curl",
    name: "Leg Curl",
    targets: ["legs"],
    muscleGroup: "Hamstrings",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "curl",
  },
  {
    id: "cable-kickback",
    name: "Cable Kickback",
    targets: ["glutes"],
    muscleGroup: "Glutes",
    equipment: ["gym", "mixed"],
    categories: ["Strength"],
    demoType: "kick",
  },
  {
    id: "plank",
    name: "Plank",
    targets: ["core"],
    muscleGroup: "Core",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Core", "Strength"],
    demoType: "hold",
    timed: true,
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    targets: ["core"],
    muscleGroup: "Core",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Core"],
    demoType: "hold",
  },
  {
    id: "bird-dog",
    name: "Bird Dog",
    targets: ["core", "back"],
    muscleGroup: "Core",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Core", "Mobility"],
    demoType: "hold",
  },
  {
    id: "hollow-hold",
    name: "Hollow Body Hold",
    targets: ["core"],
    muscleGroup: "Core",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Core"],
    demoType: "hold",
    timed: true,
  },
  {
    id: "russian-twist",
    name: "Russian Twist",
    targets: ["core"],
    muscleGroup: "Obliques",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Core", "HIIT"],
    demoType: "twist",
  },
  {
    id: "hanging-raise",
    name: "Hanging Leg Raise",
    targets: ["core"],
    muscleGroup: "Abs",
    equipment: ["gym", "mixed"],
    categories: ["Core", "Strength"],
    demoType: "raise",
  },
  {
    id: "cable-crunch",
    name: "Cable Crunch",
    targets: ["core"],
    muscleGroup: "Abs",
    equipment: ["gym", "mixed"],
    categories: ["Core", "Strength"],
    demoType: "hold",
  },
  {
    id: "jumping-jack",
    name: "Jumping Jacks",
    targets: ["cardio", "legs"],
    muscleGroup: "Full body",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT", "Cardio"],
    demoType: "jump",
    timed: true,
  },
  {
    id: "high-knees",
    name: "High Knees",
    targets: ["cardio", "legs", "core"],
    muscleGroup: "Cardio",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT", "Cardio"],
    demoType: "run",
    timed: true,
  },
  {
    id: "burpee",
    name: "Burpees",
    targets: ["cardio", "legs", "chest", "core"],
    muscleGroup: "Full body",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT"],
    demoType: "jump",
    timed: true,
  },
  {
    id: "jump-squat",
    name: "Jump Squats",
    targets: ["cardio", "legs", "glutes"],
    muscleGroup: "Legs",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT"],
    demoType: "jump",
    timed: true,
  },
  {
    id: "skater-hop",
    name: "Skater Hops",
    targets: ["cardio", "legs"],
    muscleGroup: "Legs",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT"],
    demoType: "jump",
    timed: true,
  },
  {
    id: "mountain-climber",
    name: "Mountain Climbers",
    targets: ["cardio", "core"],
    muscleGroup: "Core",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["HIIT", "Core"],
    demoType: "climb",
    timed: true,
  },
  {
    id: "db-thruster",
    name: "Dumbbell Thruster",
    targets: ["cardio", "legs", "chest"],
    muscleGroup: "Full body",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["HIIT", "Strength"],
    demoType: "press",
  },
  {
    id: "db-swing",
    name: "Dumbbell Swing",
    targets: ["cardio", "legs", "glutes"],
    muscleGroup: "Posterior chain",
    equipment: ["dumbbells", "gym", "mixed"],
    categories: ["HIIT"],
    demoType: "hinge",
    timed: true,
  },
  {
    id: "row-erg",
    name: "Row Erg Intervals",
    targets: ["cardio", "back", "legs"],
    muscleGroup: "Cardio",
    equipment: ["gym", "mixed"],
    categories: ["Cardio", "HIIT"],
    demoType: "row",
    timed: true,
  },
  {
    id: "assault-bike",
    name: "Assault Bike Intervals",
    targets: ["cardio", "legs", "arms"],
    muscleGroup: "Cardio",
    equipment: ["gym", "mixed"],
    categories: ["Cardio", "HIIT"],
    demoType: "bike",
    timed: true,
  },
  {
    id: "treadmill",
    name: "Treadmill Intervals",
    targets: ["cardio", "legs"],
    muscleGroup: "Cardio",
    equipment: ["gym", "mixed"],
    categories: ["Cardio", "HIIT"],
    demoType: "run",
    timed: true,
  },
  {
    id: "tempo-run",
    name: "Tempo Run",
    targets: ["cardio", "legs"],
    muscleGroup: "Cardio",
    equipment: ["none", "gym", "mixed"],
    categories: ["Cardio"],
    demoType: "run",
    timed: true,
  },
  {
    id: "brisk-walk",
    name: "Brisk Incline Walk",
    targets: ["cardio", "legs"],
    muscleGroup: "Cardio",
    equipment: ["none", "gym", "mixed"],
    categories: ["Cardio"],
    demoType: "run",
    timed: true,
  },
  {
    id: "cat-cow",
    name: "Cat-Cow",
    targets: ["mobility", "core"],
    muscleGroup: "Spine",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
    timed: true,
  },
  {
    id: "hip-switch",
    name: "90/90 Hip Switch",
    targets: ["mobility", "glutes"],
    muscleGroup: "Hips",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
  },
  {
    id: "world-stretch",
    name: "World's Greatest Stretch",
    targets: ["mobility", "legs"],
    muscleGroup: "Hips",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
    timed: true,
  },
  {
    id: "thoracic",
    name: "Thoracic Rotation",
    targets: ["mobility", "back"],
    muscleGroup: "Upper back",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
  },
  {
    id: "wall-slide",
    name: "Shoulder Wall Slide",
    targets: ["mobility", "back"],
    muscleGroup: "Shoulders",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
  },
  {
    id: "hip-flexor",
    name: "Half-Kneeling Hip Flexor Stretch",
    targets: ["mobility", "legs"],
    muscleGroup: "Hips",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
    timed: true,
  },
  {
    id: "hamstring-floss",
    name: "Hamstring Floss",
    targets: ["mobility", "legs"],
    muscleGroup: "Hamstrings",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
  },
  {
    id: "ankle-rock",
    name: "Ankle Rock",
    targets: ["mobility", "legs"],
    muscleGroup: "Ankles",
    equipment: ["none", "dumbbells", "gym", "mixed"],
    categories: ["Mobility"],
    demoType: "stretch",
  },
];

export const EXERCISE_LIBRARY: ExerciseLibraryItem[] = E.map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  muscleGroup: exercise.muscleGroup,
  demoType: exercise.demoType,
  equipment: exercise.equipment,
  targets: exercise.targets,
  categories: exercise.categories,
  timed: Boolean(exercise.timed),
  defaultSets: 3,
  defaultReps: exercise.timed ? "30" : "10-12",
  defaultRest: exercise.categories.includes("Mobility") ? "20s" : "60s",
}));

const GOALS: Goal[] = [
  "lose_weight",
  "build_muscle",
  "recomp",
  "endurance",
  "maintain",
  "get_stronger",
  "overall",
];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const EQUIPMENT: EquipmentSetup[] = ["none", "dumbbells", "gym", "mixed"];
const DURATIONS = [20, 30, 45, 60] as const;
const SERIES = [
  "Foundation",
  "Momentum",
  "Forge",
  "Prime",
  "Apex",
  "Elevate",
  "Atlas",
  "Pulse",
  "Velocity",
  "Stronghold",
  "Ignite",
  "Progressive",
] as const;

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function difficulty(level: ExperienceLevel): Difficulty {
  return level === "beginner" ? "Beginner" : level === "advanced" ? "Advanced" : "Intermediate";
}

function planEquipment(setup: EquipmentSetup): EquipmentSetup[] {
  if (setup === "none") return ["none", "dumbbells", "gym", "mixed"];
  if (setup === "dumbbells") return ["dumbbells", "gym", "mixed"];
  if (setup === "gym") return ["gym", "mixed"];
  return ["mixed"];
}

function exerciseCount(duration: number, category: Category): number {
  if (category === "Cardio") return duration <= 20 ? 3 : 4;
  if (duration <= 20) return 4;
  if (duration <= 30) return 5;
  if (duration <= 45) return 6;
  return 7;
}

function buildExercise(
  seed: ExerciseSeed,
  workoutId: string,
  level: ExperienceLevel,
  category: Category,
  goal: Goal,
): Exercise {
  const hard = level === "advanced";
  const beginner = level === "beginner";
  const conditioning = category === "HIIT" || category === "Cardio";
  const mobility = category === "Mobility";
  const sets = mobility ? 2 : conditioning ? (hard ? 5 : beginner ? 3 : 4) : hard ? 4 : 3;
  const useTime = seed.timed || conditioning || mobility;
  const time = mobility
    ? "45s"
    : category === "Cardio"
      ? goal === "endurance"
        ? "4 min"
        : "2 min"
      : hard
        ? "45s"
        : beginner
          ? "30s"
          : "40s";
  const reps =
    goal === "get_stronger"
      ? hard
        ? "5-8"
        : "8-10"
      : hard
        ? "8-12"
        : beginner
          ? "10-12"
          : "10-15";
  const rest = mobility
    ? "20s"
    : conditioning
      ? hard
        ? "30s"
        : "40s"
      : goal === "get_stronger"
        ? "90s"
        : hard
          ? "75s"
          : "60s";

  return {
    id: `${seed.id}-${hash(`${workoutId}-${seed.id}`).toString(36)}`,
    name: seed.name,
    sets,
    ...(useTime ? { time } : { reps }),
    rest,
    muscleGroup: seed.muscleGroup,
    difficulty: difficulty(level),
    demoType: seed.demoType,
  };
}

function buildWorkout(
  blueprint: Blueprint,
  setup: EquipmentSetup,
  level: ExperienceLevel,
  goal: Goal,
  duration: (typeof DURATIONS)[number],
  variant: number,
): Workout {
  const id = `sora-${blueprint.id}-${setup}-${level}-${goal}-${duration}-${variant}`;
  const seed = hash(id);
  const candidates = E.filter(
    (exercise) =>
      exercise.equipment.includes(setup) &&
      exercise.categories.includes(blueprint.category) &&
      exercise.targets.some((target) => blueprint.targetMuscles.includes(target)),
  );
  const fallback = E.filter(
    (exercise) =>
      exercise.equipment.includes(setup) && exercise.categories.includes(blueprint.category),
  );
  const selected = [
    ...new Map([...candidates, ...fallback].map((exercise) => [exercise.id, exercise])).values(),
  ]
    .sort((a, b) => hash(`${id}-${a.id}`) - hash(`${id}-${b.id}`))
    .slice(0, exerciseCount(duration, blueprint.category));
  const title = `${SERIES[seed % SERIES.length]} ${blueprint.name}`;
  const levelMultiplier = level === "advanced" ? 1.18 : level === "beginner" ? 0.82 : 1;
  const categoryRate =
    blueprint.category === "Mobility"
      ? 3
      : blueprint.category === "Core"
        ? 5
        : blueprint.category === "Strength"
          ? 7
          : 10;

  return {
    id,
    title,
    category: blueprint.category,
    description: `${blueprint.description} Built for ${duration}-minute sessions with ${setup === "none" ? "no equipment" : setup === "dumbbells" ? "dumbbells" : setup === "gym" ? "full gym access" : "a mixed setup"}.`,
    duration,
    calories: Math.round(duration * categoryRate * levelMultiplier),
    difficulty: difficulty(level),
    equipment: planEquipment(setup),
    targetMuscles: blueprint.targetMuscles,
    exercises: selected.map((exercise) =>
      buildExercise(exercise, id, level, blueprint.category, goal),
    ),
    thumbnail: blueprint.thumbnail,
    image: blueprint.image,
    imagePosition: blueprint.imagePosition,
    recommendedForGoals: [goal],
    recommendedForLevels: [level],
  };
}

export const GENERATED_WORKOUT_COUNT = 1800;

export function createGeneratedWorkoutCatalog(): Workout[] {
  const combinations: Workout[] = [];
  for (const blueprint of BLUEPRINTS) {
    for (const setup of EQUIPMENT) {
      for (const level of LEVELS) {
        for (const goal of GOALS) {
          for (const duration of DURATIONS) {
            for (let variant = 1; variant <= 2; variant += 1) {
              combinations.push(buildWorkout(blueprint, setup, level, goal, duration, variant));
            }
          }
        }
      }
    }
  }

  return combinations
    .sort((a, b) => hash(`catalog-${a.id}`) - hash(`catalog-${b.id}`))
    .slice(0, GENERATED_WORKOUT_COUNT);
}
