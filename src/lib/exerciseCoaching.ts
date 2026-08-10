import type { ExperienceLevel, Goal } from "./profile";

export type AnimationType =
  | "squat"
  | "pushup"
  | "lunge"
  | "plank"
  | "shoulderPress"
  | "benchPress"
  | "row"
  | "curl"
  | "tricepsExtension"
  | "lateralRaise"
  | "hinge"
  | "bridge"
  | "pull"
  | "run"
  | "jump"
  | "twist"
  | "stretch"
  | "kickback"
  | "idle";

export type MuscleKey =
  | "chest"
  | "upperChest"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "triceps"
  | "biceps"
  | "forearms"
  | "lats"
  | "midBack"
  | "traps"
  | "core"
  | "obliques"
  | "lowerBack"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "hips";

export type DemoEquipment =
  | "bodyweight"
  | "floor"
  | "dumbbells"
  | "dumbbellBench"
  | "barbellBench"
  | "cableMachine"
  | "pullupBar";

export const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: "Chest",
  upperChest: "Upper chest",
  frontDelts: "Front delts",
  sideDelts: "Side delts",
  rearDelts: "Rear delts",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  lats: "Lats",
  midBack: "Mid back",
  traps: "Traps",
  core: "Core",
  obliques: "Obliques",
  lowerBack: "Lower back",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  hips: "Hips",
};

export interface ExerciseDemoInfo {
  animation: AnimationType;
  equipment?: DemoEquipment;
  primaryMuscles: MuscleKey[];
  secondaryMuscles: MuscleKey[];
  formInstructions: string[];
  breathing: string;
  mistakes: string[];
  safetyTips: string[];
  trainerCue: string;
}

export interface CoachingInfo {
  title: string;
  tips: string[];
  mistakes: string[];
  muscles: string[];
}

type ExerciseLike = {
  name: string;
  demoType?: string;
  muscleGroup?: string;
};

function textFor(name: string, demoType?: string, muscleGroup?: string) {
  return `${name} ${demoType ?? ""} ${muscleGroup ?? ""}`.toLowerCase();
}

export function detectAnimation(
  name: string,
  demoType?: string,
  muscleGroup?: string,
): AnimationType {
  const s = textFor(name, demoType, muscleGroup);

  if (
    s.includes("bench press") ||
    s.includes("db bench") ||
    s.includes("incline db") ||
    s.includes("close-grip")
  ) {
    return "benchPress";
  }
  if (
    s.includes("pushdown") ||
    s.includes("skullcrusher") ||
    s.includes("triceps extension") ||
    s.includes("dips")
  ) {
    return "tricepsExtension";
  }
  if (
    s.includes("shoulder press") ||
    s.includes("overhead press") ||
    s.includes("standing ohp") ||
    s.includes("ohp")
  ) {
    return "shoulderPress";
  }
  if (s.includes("lateral raise") || s.includes("pass-through")) return "lateralRaise";
  if (s.includes("row") || s.includes("face pull")) return "row";
  if (
    s.includes("pull up") ||
    s.includes("pull-up") ||
    s.includes("pullup") ||
    s.includes("pulldown")
  )
    return "pull";
  if (s.includes("curl")) return "curl";
  if (
    s.includes("romanian") ||
    s.includes("deadlift") ||
    s.includes("hinge") ||
    s.includes("swing")
  )
    return "hinge";
  if (s.includes("bridge") || s.includes("hip thrust")) return "bridge";
  if (s.includes("kickback")) return "kickback";
  if (s.includes("squat") || s.includes("wall sit")) return "squat";
  if (
    s.includes("lunge") ||
    s.includes("split squat") ||
    s.includes("step up") ||
    s.includes("step")
  )
    return "lunge";
  if (s.includes("push up") || s.includes("push-up") || s.includes("pushup")) return "pushup";
  if (s.includes("twist")) return "twist";
  if (
    s.includes("plank") ||
    s.includes("hold") ||
    s.includes("hollow") ||
    s.includes("bird") ||
    s.includes("dead bug") ||
    s.includes("climber")
  ) {
    return "plank";
  }
  if (s.includes("run") || s.includes("jog") || s.includes("knees") || s.includes("tempo"))
    return "run";
  if (s.includes("jump") || s.includes("jack") || s.includes("burpee")) return "jump";
  if (
    s.includes("stretch") ||
    s.includes("cat-cow") ||
    s.includes("90/90") ||
    s.includes("mobility")
  )
    return "stretch";
  if (s.includes("press")) return "benchPress";
  return "idle";
}

export function detectDemoEquipment(
  name: string,
  animation: AnimationType,
  demoType?: string,
  muscleGroup?: string,
): DemoEquipment {
  const s = textFor(name, demoType, muscleGroup);

  if (animation === "benchPress") {
    if (s.includes("db") || s.includes("dumbbell") || s.includes("incline db"))
      return "dumbbellBench";
    return "barbellBench";
  }
  if (animation === "pull") {
    if (s.includes("pull up") || s.includes("pull-up") || s.includes("pullup")) return "pullupBar";
    return "cableMachine";
  }
  if (
    ["shoulderPress", "row", "curl", "tricepsExtension", "lateralRaise", "hinge"].includes(
      animation,
    )
  ) {
    return s.includes("cable") || s.includes("face pull") || s.includes("pushdown")
      ? "cableMachine"
      : "dumbbells";
  }
  if (["pushup", "plank", "bridge", "twist", "stretch"].includes(animation)) return "floor";
  return "bodyweight";
}

const DEMOS: Record<AnimationType, ExerciseDemoInfo> = {
  squat: {
    animation: "squat",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "core", "calves"],
    formInstructions: [
      "Feet shoulder-width, ribs stacked over hips.",
      "Sit the hips back and down while the knees track over the toes.",
      "Keep the whole foot planted and drive through mid-foot to stand.",
    ],
    breathing: "Inhale before you descend. Exhale as you drive back up.",
    mistakes: ["Knees caving inward", "Heels lifting", "Rounding the low back"],
    safetyTips: ["Use a pain-free depth.", "Keep reps smooth and stop before form breaks."],
    trainerCue: "Chest tall, knees out, push the floor away.",
  },
  pushup: {
    animation: "pushup",
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["frontDelts", "core"],
    formInstructions: [
      "Hands just outside shoulder width and body in one long line.",
      "Lower with elbows around 45 degrees from the torso.",
      "Press the floor away without letting the hips sag.",
    ],
    breathing: "Inhale on the way down. Exhale through the press.",
    mistakes: ["Hips sagging", "Elbows flaring wide", "Half reps"],
    safetyTips: ["Elevate your hands if full pushups bother the shoulders or wrists."],
    trainerCue: "Brace like a plank, then move the whole body as one unit.",
  },
  lunge: {
    animation: "lunge",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "core", "calves"],
    formInstructions: [
      "Take a long enough step for both knees to bend comfortably.",
      "Keep the torso tall and front knee tracking over the middle toes.",
      "Drive through the front heel and mid-foot to return.",
    ],
    breathing: "Inhale as you lower. Exhale as you stand.",
    mistakes: [
      "Front knee collapsing inward",
      "Pushing off the back foot too much",
      "Short unstable steps",
    ],
    safetyTips: ["Hold support if balance limits your form."],
    trainerCue: "Drop straight down, then stand through the front leg.",
  },
  plank: {
    animation: "plank",
    primaryMuscles: ["core"],
    secondaryMuscles: ["frontDelts", "glutes", "lowerBack"],
    formInstructions: [
      "Stack shoulders over elbows or hands.",
      "Squeeze glutes and keep ribs pulled down.",
      "Hold a straight line from head through heels.",
    ],
    breathing: "Use slow nasal breaths without losing the brace.",
    mistakes: ["Hips sagging", "Butt too high", "Holding your breath"],
    safetyTips: ["Stop when your low back starts taking over."],
    trainerCue: "Long spine, hard brace, quiet breathing.",
  },
  shoulderPress: {
    animation: "shoulderPress",
    primaryMuscles: ["frontDelts", "sideDelts"],
    secondaryMuscles: ["triceps", "upperChest", "core"],
    formInstructions: [
      "Start with weights at shoulder height and forearms vertical.",
      "Brace the core before pressing overhead.",
      "Finish with biceps near ears, then lower under control.",
    ],
    breathing: "Inhale and brace at the bottom. Exhale as the weights pass eye level.",
    mistakes: [
      "Overarching the lower back",
      "Pressing too far forward",
      "Bouncing out of the bottom",
    ],
    safetyTips: ["Use a neutral grip if shoulders feel pinchy."],
    trainerCue: "Ribs down, press straight up.",
  },
  benchPress: {
    animation: "benchPress",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "frontDelts", "upperChest"],
    formInstructions: [
      "Set shoulder blades down and back before the first rep.",
      "Lower the weights toward the lower chest with forearms vertical.",
      "Press up and slightly in while keeping the chest lifted.",
    ],
    breathing: "Inhale on the lower. Exhale through the press without losing shoulder position.",
    mistakes: ["Shoulders rolling forward", "Wrists bending back", "Bouncing the bottom"],
    safetyTips: ["Keep control at the bottom and avoid painful shoulder range."],
    trainerCue: "Pin the shoulders, then press the chest up to the weights.",
  },
  row: {
    animation: "row",
    primaryMuscles: ["lats", "midBack"],
    secondaryMuscles: ["rearDelts", "biceps", "forearms", "core"],
    formInstructions: [
      "Hinge at the hips and keep the spine long.",
      "Pull the elbow toward the hip, not straight up to the shoulder.",
      "Pause briefly at the top before lowering with control.",
    ],
    breathing: "Exhale as you row. Inhale as the arm reaches long.",
    mistakes: ["Twisting the torso", "Shrugging the shoulder", "Using momentum"],
    safetyTips: ["Keep the neck neutral and avoid jerking from the low back."],
    trainerCue: "Pull elbow to pocket and squeeze the back.",
  },
  curl: {
    animation: "curl",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    formInstructions: [
      "Stand tall with elbows pinned near the ribs.",
      "Curl without swinging the torso.",
      "Squeeze at the top and lower slowly.",
    ],
    breathing: "Exhale as you curl. Inhale as you lower.",
    mistakes: ["Swinging", "Elbows drifting forward", "Dropping the weight"],
    safetyTips: ["Choose a load you can control through the full range."],
    trainerCue: "Elbows stay quiet; only the forearms move.",
  },
  tricepsExtension: {
    animation: "tricepsExtension",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["forearms", "frontDelts", "core"],
    formInstructions: [
      "Keep upper arms steady and elbows pointing forward or down.",
      "Bend only at the elbows until you feel a triceps stretch.",
      "Extend fully without snapping the elbows.",
    ],
    breathing: "Inhale on the bend. Exhale as you straighten the arms.",
    mistakes: ["Elbows flaring", "Moving the shoulders", "Locking out aggressively"],
    safetyTips: ["Use a lighter load if elbows feel irritated."],
    trainerCue: "Freeze the upper arm and finish with the triceps.",
  },
  lateralRaise: {
    animation: "lateralRaise",
    primaryMuscles: ["sideDelts"],
    secondaryMuscles: ["frontDelts", "traps", "core"],
    formInstructions: [
      "Soft elbows, wrists neutral, and shoulders down.",
      "Raise arms to shoulder height with control.",
      "Lower slowly and avoid bouncing.",
    ],
    breathing: "Exhale as arms rise. Inhale as they lower.",
    mistakes: ["Shrugging", "Swinging the body", "Lifting above a pain-free range"],
    safetyTips: ["Use light weights and stop below shoulder height if needed."],
    trainerCue: "Reach wide, not high.",
  },
  hinge: {
    animation: "hinge",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lowerBack", "core", "forearms"],
    formInstructions: [
      "Soften the knees and push the hips back.",
      "Keep weights close to the legs and spine neutral.",
      "Stand by driving hips forward, not by leaning back.",
    ],
    breathing: "Inhale as you hinge. Exhale as you stand tall.",
    mistakes: ["Rounding the spine", "Squatting instead of hinging", "Weights drifting forward"],
    safetyTips: ["Stop the descent when hamstrings limit the range."],
    trainerCue: "Hips back, back flat, weights close.",
  },
  bridge: {
    animation: "bridge",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "core", "lowerBack"],
    formInstructions: [
      "Feet planted and ribs down.",
      "Drive hips up until knees, hips, and shoulders line up.",
      "Pause at the top and lower with control.",
    ],
    breathing: "Exhale as you lift. Inhale as you lower.",
    mistakes: ["Overarching the low back", "Feet too far away", "No pause at the top"],
    safetyTips: ["Keep the range in the glutes, not the lower back."],
    trainerCue: "Tuck slightly, squeeze hard, then lower slow.",
  },
  pull: {
    animation: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["midBack", "biceps", "forearms", "rearDelts"],
    formInstructions: [
      "Start with shoulders set down away from ears.",
      "Pull elbows toward the ribs.",
      "Control the return until arms are long again.",
    ],
    breathing: "Exhale during the pull. Inhale on the controlled return.",
    mistakes: ["Shrugging", "Only bending the elbows", "Using momentum"],
    safetyTips: ["Use assistance or lighter loading if shoulders pinch."],
    trainerCue: "Shoulders down, elbows to ribs.",
  },
  run: {
    animation: "run",
    primaryMuscles: ["quads", "calves"],
    secondaryMuscles: ["glutes", "hamstrings", "core"],
    formInstructions: [
      "Stay tall with a slight forward lean from the ankles.",
      "Land softly under the hips.",
      "Keep arms relaxed and rhythmic.",
    ],
    breathing: "Use a steady rhythm: two to three steps per inhale and exhale.",
    mistakes: ["Overstriding", "Tensing shoulders", "Heavy heel striking"],
    safetyTips: ["Build intensity gradually and stop if sharp pain appears."],
    trainerCue: "Tall posture, soft steps, relaxed shoulders.",
  },
  jump: {
    animation: "jump",
    primaryMuscles: ["quads", "glutes", "calves"],
    secondaryMuscles: ["core", "hamstrings"],
    formInstructions: [
      "Load through the hips and knees.",
      "Explode through the floor, then land softly.",
      "Keep knees aligned over toes on every landing.",
    ],
    breathing: "Exhale on effort. Reset your breath as you land.",
    mistakes: ["Loud landings", "Knees caving", "Rushing reps"],
    safetyTips: ["Reduce impact if knees, ankles, or back feel irritated."],
    trainerCue: "Spring up, absorb quietly.",
  },
  twist: {
    animation: "twist",
    primaryMuscles: ["obliques", "core"],
    secondaryMuscles: ["hips", "lowerBack"],
    formInstructions: [
      "Sit tall and brace before rotating.",
      "Turn through the ribs, not by yanking with the arms.",
      "Keep the movement controlled side to side.",
    ],
    breathing: "Exhale on each rotation. Inhale through center.",
    mistakes: ["Rounding the back", "Swinging too fast", "Holding breath"],
    safetyTips: ["Keep range small if your low back feels tight."],
    trainerCue: "Rotate the trunk, not just the hands.",
  },
  stretch: {
    animation: "stretch",
    primaryMuscles: ["hips", "hamstrings"],
    secondaryMuscles: ["lats", "lowerBack", "glutes"],
    formInstructions: [
      "Move slowly into the end range.",
      "Keep tension mild and controllable.",
      "Ease deeper only as the breath relaxes.",
    ],
    breathing: "Use long exhales to reduce tension.",
    mistakes: ["Forcing range", "Bouncing", "Holding breath"],
    safetyTips: ["Avoid sharp pain or numbness."],
    trainerCue: "Slow breath, smooth range.",
  },
  kickback: {
    animation: "kickback",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "core"],
    formInstructions: [
      "Brace the core and keep hips square.",
      "Drive the heel back without arching the low back.",
      "Pause when the glute is fully squeezed.",
    ],
    breathing: "Exhale as the leg drives back. Inhale on the return.",
    mistakes: ["Rotating the hips open", "Overarching the spine", "Swinging the leg"],
    safetyTips: ["Keep the range smaller if your low back takes over."],
    trainerCue: "Heel back, hips square, glute squeeze.",
  },
  idle: {
    animation: "idle",
    primaryMuscles: ["core"],
    secondaryMuscles: ["quads", "glutes"],
    formInstructions: [
      "Move with control through the full available range.",
      "Keep joints stacked and avoid rushing reps.",
      "Use the highlighted muscles as the focus of each rep.",
    ],
    breathing: "Exhale on effort and inhale during the easier phase.",
    mistakes: ["Using momentum", "Losing posture", "Ignoring pain"],
    safetyTips: ["Warm up first and stop if you feel sharp pain."],
    trainerCue: "Control the rep from start to finish.",
  },
};

function adjustForContext(
  info: ExerciseDemoInfo,
  experience?: ExperienceLevel,
  goal?: Goal,
): ExerciseDemoInfo {
  const formInstructions = [...info.formInstructions];
  const safetyTips = [...info.safetyTips];

  if (experience === "beginner") {
    formInstructions.unshift("Start slower than you think and learn the path before adding speed.");
  } else if (experience === "advanced") {
    formInstructions.push("Add a brief pause at the hardest position to reinforce control.");
  }

  if (goal === "build_muscle" || goal === "recomp") {
    formInstructions.push("Use a controlled eccentric and keep tension on the target muscle.");
  }
  if (goal === "lose_weight" || goal === "endurance") {
    safetyTips.push("Keep intensity high only while form stays clean.");
  }

  return { ...info, formInstructions, safetyTips };
}

export function getExerciseDemoInfo(
  exercise: ExerciseLike,
  experience?: ExperienceLevel,
  goal?: Goal,
): ExerciseDemoInfo {
  const animation = detectAnimation(exercise.name, exercise.demoType, exercise.muscleGroup);
  const equipment = detectDemoEquipment(
    exercise.name,
    animation,
    exercise.demoType,
    exercise.muscleGroup,
  );
  if (/face[- ]pull/i.test(exercise.name)) {
    return adjustForContext(
      {
        animation,
        equipment,
        primaryMuscles: ["rearDelts", "midBack"],
        secondaryMuscles: ["traps", "biceps", "forearms"],
        formInstructions: [
          "Set the cable near eye level and step back until the rope is taut.",
          "Pull toward your temples while driving the elbows wide.",
          "Pause with the shoulder blades together, then reach forward under control.",
        ],
        breathing: "Exhale as you pull the rope in. Inhale during the controlled reach.",
        mistakes: ["Shrugging the shoulders", "Dropping the elbows", "Leaning back to finish"],
        safetyTips: ["Use a light load that lets the shoulders rotate without pain."],
        trainerCue: "Pull to the temples and show your elbows to the walls.",
      },
      experience,
      goal,
    );
  }
  return adjustForContext({ ...DEMOS[animation], equipment }, experience, goal);
}

export function muscleLabels(muscles: MuscleKey[]) {
  return muscles.map((m) => MUSCLE_LABELS[m]);
}

export function getCoaching(
  anim: AnimationType,
  experience: ExperienceLevel = "intermediate",
  goal: Goal = "maintain",
): CoachingInfo {
  const info = adjustForContext(DEMOS[anim], experience, goal);
  return {
    title: info.trainerCue,
    tips: info.formInstructions,
    mistakes: info.mistakes,
    muscles: muscleLabels([...info.primaryMuscles, ...info.secondaryMuscles]),
  };
}
