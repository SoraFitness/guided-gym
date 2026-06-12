import type { ExperienceLevel, Goal } from "./profile";

export type AnimationType =
  | "squat"
  | "pushup"
  | "lunge"
  | "plank"
  | "shoulderPress"
  | "curl"
  | "idle";

export function detectAnimation(name: string, demoType?: string): AnimationType {
  const s = `${name} ${demoType ?? ""}`.toLowerCase();
  if (s.includes("squat") || s.includes("wall sit")) return "squat";
  if (s.includes("push up") || s.includes("push-up") || s.includes("pushup")) return "pushup";
  if (s.includes("lunge") || s.includes("split squat") || s.includes("step")) return "lunge";
  if (s.includes("plank") || s.includes("hold") || s.includes("hollow") || s.includes("bird")) return "plank";
  if (
    s.includes("shoulder press") ||
    s.includes("overhead press") ||
    s.includes("ohp") ||
    s.includes("press")
  )
    return "shoulderPress";
  if (s.includes("curl")) return "curl";
  return "idle";
}

export interface CoachingInfo {
  title: string;
  tips: string[];
  mistakes: string[];
  muscles: string[];
}

const COACHING: Record<AnimationType, CoachingInfo> = {
  squat: {
    title: "Squat",
    tips: [
      "Keep your chest up and proud",
      "Push your hips back as you lower",
      "Knees track over your toes",
      "Keep heels planted on the floor",
      "Control the lowering phase (2-3 sec)",
    ],
    mistakes: ["Knees collapsing inward", "Rounding the lower back", "Heels lifting up", "Dropping too fast"],
    muscles: ["Quads", "Glutes", "Hamstrings", "Core"],
  },
  pushup: {
    title: "Push-Up",
    tips: [
      "Form a straight line from head to heels",
      "Hands just wider than shoulders",
      "Lower until chest is an inch off the floor",
      "Elbows at roughly 45° to torso",
    ],
    mistakes: ["Hips sagging or piking up", "Flaring elbows out wide", "Half reps", "Head poking forward"],
    muscles: ["Chest", "Triceps", "Shoulders", "Core"],
  },
  lunge: {
    title: "Lunge",
    tips: [
      "Step long enough that both knees bend to 90°",
      "Keep torso tall and upright",
      "Back knee softly kisses the floor",
      "Drive through the front heel to stand",
    ],
    mistakes: ["Front knee caving inward", "Leaning forward at the waist", "Short, choppy steps"],
    muscles: ["Quads", "Glutes", "Hamstrings"],
  },
  plank: {
    title: "Plank",
    tips: [
      "Stack shoulders directly over elbows",
      "Squeeze glutes and brace your core",
      "Long neutral spine — eyes down",
      "Breathe slow and steady",
    ],
    mistakes: ["Hips sagging", "Butt in the air", "Holding your breath"],
    muscles: ["Core", "Shoulders", "Glutes"],
  },
  shoulderPress: {
    title: "Shoulder Press",
    tips: [
      "Start with weights at shoulder height",
      "Press straight up, biceps near ears at top",
      "Brace core — don't arch lower back",
      "Lower under control",
    ],
    mistakes: ["Pressing in front of body", "Arching the back", "Locking elbows aggressively"],
    muscles: ["Shoulders", "Triceps", "Upper chest"],
  },
  curl: {
    title: "Bicep Curl",
    tips: [
      "Keep elbows pinned to your sides",
      "Squeeze the bicep at the top",
      "Lower slowly — 2-3 sec eccentric",
      "Wrists stay neutral",
    ],
    mistakes: ["Swinging the body", "Elbows drifting forward", "Half-rep range"],
    muscles: ["Biceps", "Forearms"],
  },
  idle: {
    title: "Exercise Demo",
    tips: ["Move with control", "Breathe steadily", "Maintain a neutral spine", "Stop if you feel pain"],
    mistakes: ["Rushing through reps", "Using momentum instead of muscle"],
    muscles: ["Full body"],
  },
};

export function getCoaching(
  anim: AnimationType,
  experience: ExperienceLevel = "intermediate",
  goal: Goal = "maintain",
): CoachingInfo {
  const base = COACHING[anim];
  const tips = [...base.tips];
  if (experience === "beginner") {
    tips.unshift("Take it slow — focus on form before speed");
  } else if (experience === "advanced") {
    tips.push("Add tempo or pauses to intensify");
  }
  if (goal === "lose_weight") tips.push("Keep rest short to boost conditioning");
  else if (goal === "build_muscle") tips.push("Aim for full range and a strong squeeze");
  return { ...base, tips };
}
