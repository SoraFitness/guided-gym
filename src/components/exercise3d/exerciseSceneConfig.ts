// Scene configuration for the procedural Sora exercise demos: which clip an
// exercise plays, what equipment appears, how the camera frames it, and the
// setup/tempo copy shown on the demo page.

import type { AnimationType, DemoEquipment, MuscleKey } from "@/lib/exerciseCoaching";
import { resolveClip, resolveHeldProp, type ClipKey, type HeldProp } from "./exerciseClips";
import type { ScenePropKind } from "./proceduralEquipment";

export type ViewPreset = "front" | "side" | "rear";
export type Vec3 = [number, number, number];

export type CameraPreset = {
  direction: Vec3;
  fov: number;
  label: string;
};

export type SceneFitBox = {
  center: Vec3;
  size: Vec3;
  padding: number;
};

export type ExerciseTempo = {
  eccentricSeconds: number;
  pauseSeconds: number;
  concentricSeconds: number;
  label: string;
};

export type ExerciseAnimationConfig = {
  exerciseId: string;
  animation: AnimationType;
  clip: ClipKey;
  held: HeldProp;
  props: ScenePropKind[];
  playbackSpeed: number;
  setup: {
    posture: "standing" | "seated" | "supine" | "prone" | "floor" | "hanging";
    description: string;
  };
  tempo: ExerciseTempo;
  fitBox: SceneFitBox;
  cameraPresets: Record<ViewPreset, CameraPreset>;
  orbit: {
    minDistanceScale: number;
    maxDistanceScale: number;
    minPolarAngle: number;
    maxPolarAngle: number;
  };
  primaryMuscles: MuscleKey[];
  secondaryMuscles: MuscleKey[];
};

/* --------------------------------- framing ---------------------------------- */

function cameras(elevation: number, fov: number): Record<ViewPreset, CameraPreset> {
  return {
    front: { direction: [0.52, elevation, 1], fov, label: "3/4" },
    side: { direction: [1, elevation, 0.06], fov, label: "Side" },
    rear: { direction: [0, elevation + 0.04, -1], fov, label: "Rear" },
  };
}

function posteriorCameras(elevation: number, fov: number): Record<ViewPreset, CameraPreset> {
  return {
    front: { direction: [-0.52, elevation, -1], fov, label: "3/4" },
    side: { direction: [1, elevation, -0.06], fov, label: "Side" },
    rear: { direction: [0.9, elevation + 0.04, 1], fov, label: "Front" },
  };
}

const STANDING_BOX: SceneFitBox = { center: [0, 1.02, 0], size: [2.0, 2.25, 1.6], padding: 1.16 };
const TALL_BOX: SceneFitBox = { center: [0, 1.15, 0], size: [2.3, 2.6, 1.8], padding: 1.14 };
const LOWER_BOX: SceneFitBox = { center: [0, 0.92, 0], size: [2.1, 2.25, 2.1], padding: 1.16 };
const FLOOR_BOX: SceneFitBox = { center: [0, 0.42, 0], size: [2.4, 1.35, 2.6], padding: 1.16 };
const QUAD_BOX: SceneFitBox = { center: [0, 0.55, 0], size: [2.3, 1.6, 2.4], padding: 1.16 };
const BENCH_BOX: SceneFitBox = { center: [0, 0.62, 0], size: [2.3, 1.6, 2.4], padding: 1.15 };
const PULL_BOX: SceneFitBox = { center: [0, 1.5, 0], size: [2.2, 2.9, 1.7], padding: 1.14 };

const ORBIT_DEFAULT = {
  minDistanceScale: 0.74,
  maxDistanceScale: 1.9,
  minPolarAngle: 0.42,
  maxPolarAngle: 1.48,
};

type ClipScene = {
  fitBox: SceneFitBox;
  cameraPresets: Record<ViewPreset, CameraPreset>;
  setup: ExerciseAnimationConfig["setup"];
  tempo: ExerciseTempo;
  props: ScenePropKind[];
  primaryMuscles: MuscleKey[];
  secondaryMuscles: MuscleKey[];
};

const t = (
  eccentricSeconds: number,
  concentricSeconds: number,
  label: string,
  pauseSeconds = 0.25,
): ExerciseTempo => ({ eccentricSeconds, concentricSeconds, pauseSeconds, label });

const CLIP_SCENES: Record<ClipKey, ClipScene> = {
  idle: {
    fitBox: STANDING_BOX,
    cameraPresets: cameras(0.2, 34),
    props: [],
    setup: {
      posture: "standing",
      description: "Athletic stance, feet under hips, shoulders relaxed.",
    },
    tempo: t(2, 2, "Smooth and controlled"),
    primaryMuscles: ["core"],
    secondaryMuscles: ["quads", "glutes"],
  },
  squat: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.22, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Feet shoulder-width, chest tall, weight over mid-foot.",
    },
    tempo: t(2, 2, "2s down / 2s up"),
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "core", "calves"],
  },
  wallSit: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.22, 35),
    props: ["wall"],
    setup: {
      posture: "standing",
      description: "Back flat on the wall, thighs parallel to the floor.",
    },
    tempo: t(0, 0, "Static hold", 0),
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes", "core", "calves"],
  },
  pushup: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.55, 36),
    props: ["mat"],
    setup: { posture: "prone", description: "Hands under shoulders, body in one straight line." },
    tempo: t(2, 1, "2s down / 1s press"),
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["frontDelts", "core"],
  },
  lunge: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.22, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Long stride back, torso tall, front knee over the toes.",
    },
    tempo: t(2, 1.5, "2s lower / drive up"),
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "core", "calves"],
  },
  stepUp: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.22, 35),
    props: ["stepBox"],
    setup: {
      posture: "standing",
      description: "Whole foot on the box, drive through the front heel.",
    },
    tempo: t(1.5, 1.5, "Controlled up and down"),
    primaryMuscles: ["glutes", "quads"],
    secondaryMuscles: ["hamstrings", "calves", "core"],
  },
  plank: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.55, 36),
    props: ["mat"],
    setup: {
      posture: "prone",
      description: "Elbows under shoulders, glutes tight, long straight line.",
    },
    tempo: t(0, 0, "Static hold", 0),
    primaryMuscles: ["core"],
    secondaryMuscles: ["frontDelts", "glutes", "lowerBack"],
  },
  mountainClimber: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.55, 36),
    props: ["mat"],
    setup: {
      posture: "prone",
      description: "High plank on the hands, hips level while knees drive in.",
    },
    tempo: t(0.5, 0.5, "Quick alternating drive", 0),
    primaryMuscles: ["core"],
    secondaryMuscles: ["quads", "frontDelts", "hips"],
  },
  deadBug: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.6, 36),
    props: ["mat"],
    setup: {
      posture: "supine",
      description: "Low back pressed down, arms and knees stacked to start.",
    },
    tempo: t(2, 2, "Slow opposite reach"),
    primaryMuscles: ["core"],
    secondaryMuscles: ["hips", "lowerBack"],
  },
  birdDog: {
    fitBox: QUAD_BOX,
    cameraPresets: cameras(0.42, 36),
    props: ["mat"],
    setup: {
      posture: "floor",
      description: "Hands under shoulders, knees under hips, spine neutral.",
    },
    tempo: t(2, 2, "Reach, hold, return"),
    primaryMuscles: ["core", "lowerBack"],
    secondaryMuscles: ["glutes", "rearDelts"],
  },
  hollowHold: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.6, 36),
    props: ["mat"],
    setup: { posture: "supine", description: "Low back glued to the mat, arms and legs long." },
    tempo: t(0, 0, "Static hold", 0),
    primaryMuscles: ["core"],
    secondaryMuscles: ["quads", "hips"],
  },
  shoulderPress: {
    fitBox: TALL_BOX,
    cameraPresets: cameras(0.2, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Dumbbells at shoulder height, ribs stacked over hips.",
    },
    tempo: t(2, 2, "2s press / 2s lower"),
    primaryMuscles: ["frontDelts", "sideDelts"],
    secondaryMuscles: ["triceps", "upperChest", "core"],
  },
  benchPress: {
    fitBox: BENCH_BOX,
    cameraPresets: cameras(0.4, 37),
    props: ["bench"],
    setup: {
      posture: "supine",
      description: "Shoulder blades set on the bench, feet planted wide.",
    },
    tempo: t(2, 2, "2s lower / 2s press"),
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "frontDelts", "upperChest"],
  },
  row: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.26, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Hips hinged, spine long, weights hanging under the shoulders.",
    },
    tempo: t(2, 1.5, "Pull, squeeze, lower"),
    primaryMuscles: ["lats", "midBack"],
    secondaryMuscles: ["rearDelts", "biceps", "core"],
  },
  facePull: {
    fitBox: STANDING_BOX,
    cameraPresets: posteriorCameras(0.2, 34),
    props: [],
    setup: {
      posture: "standing",
      description: "Cable at eye level, ribs stacked, and arms reaching long to begin.",
    },
    tempo: t(2, 1.5, "Reach, pull wide, squeeze"),
    primaryMuscles: ["rearDelts", "midBack"],
    secondaryMuscles: ["traps", "biceps", "forearms"],
  },
  curl: {
    fitBox: STANDING_BOX,
    cameraPresets: cameras(0.2, 34),
    props: [],
    setup: { posture: "standing", description: "Elbows pinned to the ribs, wrists neutral." },
    tempo: t(2, 1.5, "Curl up / slow lower"),
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
  },
  tricepsExtension: {
    fitBox: TALL_BOX,
    cameraPresets: cameras(0.2, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Upper arms locked overhead, elbows pointing forward.",
    },
    tempo: t(2, 1.5, "Bend deep / extend"),
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["forearms", "core"],
  },
  dip: {
    fitBox: { center: [0, 0.72, 0], size: [2.1, 1.8, 2.2], padding: 1.16 },
    cameraPresets: cameras(0.3, 35),
    props: ["benchBehind"],
    setup: { posture: "seated", description: "Hands on the bench edge behind you, heels forward." },
    tempo: t(2, 1.5, "2s lower / press up"),
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["frontDelts", "chest", "core"],
  },
  lateralRaise: {
    fitBox: STANDING_BOX,
    cameraPresets: cameras(0.2, 34),
    props: [],
    setup: { posture: "standing", description: "Soft elbows, shoulders down away from the ears." },
    tempo: t(2, 1.5, "Raise wide / slow lower"),
    primaryMuscles: ["sideDelts"],
    secondaryMuscles: ["frontDelts", "traps", "core"],
  },
  hinge: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.24, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Soft knees, hips push back, weights stay close to the legs.",
    },
    tempo: t(2.5, 2, "Slow hinge / drive up"),
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lowerBack", "core", "forearms"],
  },
  swing: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.24, 35),
    props: [],
    setup: { posture: "standing", description: "Hips power the bell forward — arms stay relaxed." },
    tempo: t(0.7, 0.7, "Explosive hip snap", 0),
    primaryMuscles: ["glutes", "hamstrings"],
    secondaryMuscles: ["core", "lowerBack", "forearms"],
  },
  bridge: {
    fitBox: FLOOR_BOX,
    cameraPresets: cameras(0.55, 36),
    props: ["mat"],
    setup: { posture: "supine", description: "Feet planted close to the hips, ribs down." },
    tempo: t(1.5, 1.5, "Squeeze up / slow lower"),
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "core", "lowerBack"],
  },
  pull: {
    fitBox: PULL_BOX,
    cameraPresets: cameras(0.16, 36),
    props: ["pullupBar"],
    setup: {
      posture: "hanging",
      description: "Full hang, shoulders set down before the first pull.",
    },
    tempo: t(2, 1.5, "Pull up / control down"),
    primaryMuscles: ["lats"],
    secondaryMuscles: ["midBack", "biceps", "rearDelts", "core"],
  },
  pulldown: {
    fitBox: { center: [0, 1.2, 0.25], size: [2.3, 2.6, 2.2], padding: 1.15 },
    cameraPresets: cameras(0.18, 36),
    props: ["pulldownMachine"],
    setup: { posture: "seated", description: "Thighs under the pad, wide grip, chest tall." },
    tempo: t(2, 1.5, "Pull to chest / control up"),
    primaryMuscles: ["lats"],
    secondaryMuscles: ["midBack", "biceps", "rearDelts"],
  },
  run: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.22, 35),
    props: [],
    setup: {
      posture: "standing",
      description: "Tall posture, slight forward lean, soft landings.",
    },
    tempo: t(0.4, 0.4, "Steady rhythm", 0),
    primaryMuscles: ["quads", "calves"],
    secondaryMuscles: ["glutes", "hamstrings", "core"],
  },
  jumpingJack: {
    fitBox: TALL_BOX,
    cameraPresets: cameras(0.2, 36),
    props: [],
    setup: { posture: "standing", description: "Light on the feet — arms and legs open together." },
    tempo: t(0.5, 0.5, "Continuous rhythm", 0),
    primaryMuscles: ["quads", "glutes", "calves"],
    secondaryMuscles: ["core", "sideDelts"],
  },
  burpee: {
    fitBox: { center: [0, 1.0, 0], size: [2.4, 2.6, 2.5], padding: 1.15 },
    cameraPresets: cameras(0.26, 37),
    props: ["mat"],
    setup: { posture: "standing", description: "Squat, kick back to a plank, back up, and jump." },
    tempo: t(1.4, 1.4, "One flowing rep", 0),
    primaryMuscles: ["quads", "glutes", "chest"],
    secondaryMuscles: ["core", "calves", "frontDelts"],
  },
  twist: {
    fitBox: { center: [0, 0.5, 0], size: [2.2, 1.5, 2.2], padding: 1.16 },
    cameraPresets: cameras(0.5, 36),
    props: ["mat"],
    setup: { posture: "seated", description: "Lean back, chest proud, rotate through the ribs." },
    tempo: t(1, 1, "Controlled side to side", 0),
    primaryMuscles: ["obliques", "core"],
    secondaryMuscles: ["hips", "lowerBack"],
  },
  stretch: {
    fitBox: LOWER_BOX,
    cameraPresets: cameras(0.24, 35),
    props: ["mat"],
    setup: { posture: "standing", description: "Slow flowing reach — ease into each position." },
    tempo: t(3, 3, "Long slow holds", 0.5),
    primaryMuscles: ["hips", "hamstrings"],
    secondaryMuscles: ["lats", "lowerBack", "glutes"],
  },
  kickback: {
    fitBox: QUAD_BOX,
    cameraPresets: cameras(0.42, 36),
    props: ["mat"],
    setup: { posture: "floor", description: "Hips square over the knees, core braced." },
    tempo: t(1.5, 1.5, "Drive back / squeeze"),
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "core"],
  },
};

/* --------------------------------- resolver --------------------------------- */

export function getExerciseAnimationConfig({
  exerciseId,
  animation,
  equipment,
  name,
}: {
  exerciseId?: string;
  animation: AnimationType;
  equipment?: DemoEquipment;
  name?: string;
}): ExerciseAnimationConfig {
  const clip = resolveClip(animation, `${exerciseId ?? ""} ${name ?? ""}`);
  const scene = CLIP_SCENES[clip];
  const held = resolveHeldProp(clip, equipment);

  // Cable moves get the cable station unless the clip brings its own machine.
  const props =
    equipment === "cableMachine" && clip !== "pull" && clip !== "pulldown"
      ? ([...scene.props, "cableColumn"] as ScenePropKind[])
      : scene.props;

  return {
    exerciseId: exerciseId ?? animation,
    animation,
    clip,
    held,
    props,
    playbackSpeed: 1,
    setup: scene.setup,
    tempo: scene.tempo,
    fitBox: scene.fitBox,
    cameraPresets: scene.cameraPresets,
    orbit: ORBIT_DEFAULT,
    primaryMuscles: scene.primaryMuscles,
    secondaryMuscles: scene.secondaryMuscles,
  };
}
