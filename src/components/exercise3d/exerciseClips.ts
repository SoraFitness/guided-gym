// Keyframe clip library for the procedural Sora demo athlete.
//
// Conventions (character faces +Z, left arm on -X):
//  - Joint rotations are radians applied as euler XYZ on FK joint groups.
//  - Limb segments hang along -Y in their rest pose, so:
//      shoulder/hip rx < 0  -> limb swings forward (toward +Z)
//      shoulder rz > 0      -> RIGHT arm abducts out to the side (+X);
//                              the left side mirrors with negative z.
//      elbow rx < 0         -> forearm curls forward/up
//      knee rx > 0          -> shin flexes backward
//  - rootX/Y/Z are meter offsets of the whole body (rootY 0 = standing on the
//    floor); rootRX/RY/RZ pitch/turn the whole body (rootRX d(90) = prone,
//    rootRX -d(90) = supine).

import type { AnimationType, DemoEquipment } from "@/lib/exerciseCoaching";

export const d = (deg: number) => (deg * Math.PI) / 180;

export interface JointRot {
  x?: number;
  y?: number;
  z?: number;
}

export interface PartialPose {
  rootX?: number;
  rootY?: number;
  rootZ?: number;
  rootRX?: number;
  rootRY?: number;
  rootRZ?: number;
  pelvis?: JointRot;
  torso?: JointRot;
  chest?: JointRot;
  head?: JointRot;
  shoulderL?: JointRot;
  shoulderR?: JointRot;
  elbowL?: number;
  elbowR?: number;
  hipL?: JointRot;
  hipR?: JointRot;
  kneeL?: number;
  kneeR?: number;
  ankleL?: number;
  ankleR?: number;
}

// Every channel, flattened, for interpolation.
const CHANNELS = [
  "rootX", "rootY", "rootZ", "rootRX", "rootRY", "rootRZ",
  "pelvis.x", "pelvis.y", "pelvis.z",
  "torso.x", "torso.y", "torso.z",
  "chest.x", "chest.y", "chest.z",
  "head.x", "head.y", "head.z",
  "shoulderL.x", "shoulderL.y", "shoulderL.z",
  "shoulderR.x", "shoulderR.y", "shoulderR.z",
  "elbowL", "elbowR",
  "hipL.x", "hipL.y", "hipL.z",
  "hipR.x", "hipR.y", "hipR.z",
  "kneeL", "kneeR",
  "ankleL", "ankleR",
] as const;

export type Channel = (typeof CHANNELS)[number];
export type FlatPose = Record<Channel, number>;

const RELAXED: PartialPose = {
  shoulderL: { z: -d(7) },
  shoulderR: { z: d(7) },
  elbowL: -d(10),
  elbowR: -d(10),
};

function flatten(...poses: (PartialPose | undefined)[]): FlatPose {
  const out = Object.fromEntries(CHANNELS.map((c) => [c, 0])) as FlatPose;
  for (const pose of poses) {
    if (!pose) continue;
    for (const [key, value] of Object.entries(pose)) {
      if (value == null) continue;
      if (typeof value === "number") {
        out[key as Channel] = value;
      } else {
        for (const axis of ["x", "y", "z"] as const) {
          const v = (value as JointRot)[axis];
          if (v != null) out[`${key}.${axis}` as Channel] = v;
        }
      }
    }
  }
  return out;
}

// Symmetric helpers. z>0 abducts the right limb outward; left mirrors.
const arms = (x: number, z = 0, y = 0): PartialPose => ({
  shoulderL: { x, y: -y, z: -z },
  shoulderR: { x, y, z },
});
const elbows = (v: number): PartialPose => ({ elbowL: v, elbowR: v });
const hips = (x: number, z = 0): PartialPose => ({ hipL: { x, z: -z }, hipR: { x, z } });
const knees = (v: number): PartialPose => ({ kneeL: v, kneeR: v });
const ankles = (v: number): PartialPose => ({ ankleL: v, ankleR: v });
const merge = (...poses: PartialPose[]): PartialPose => Object.assign({}, ...poses);

export type ClipKey =
  | "idle" | "squat" | "wallSit" | "pushup" | "lunge" | "stepUp"
  | "plank" | "mountainClimber" | "deadBug" | "birdDog" | "hollowHold"
  | "shoulderPress" | "benchPress" | "row" | "curl" | "tricepsExtension"
  | "dip" | "lateralRaise" | "hinge" | "swing" | "bridge" | "pull"
  | "pulldown" | "run" | "jumpingJack" | "burpee" | "twist" | "stretch" | "kickback";

export type HeldProp = "none" | "dumbbells" | "kettlebell" | "barbell" | "cableBar";

export interface ExerciseClip {
  duration: number; // seconds per loop at 1x speed
  base?: PartialPose;
  keys: { t: number; pose: PartialPose }[];
  // When true the rig auto-grounds each frame: the lowest foot is pinned to the
  // floor, so authored rootY values don't need to match leg-flexion geometry.
  planted?: boolean;
}

/* ---------------------------------- clips ---------------------------------- */

const STAND_SQUAT_BOTTOM = merge(
  { rootY: -0.34, torso: { x: -d(28) }, chest: { x: -d(8) }, head: { x: d(18) } },
  hips(-d(98), d(6)),
  knees(d(112)),
  ankles(-d(16)),
  arms(-d(62)),
  elbows(-d(24)),
);

const squat: ExerciseClip = {
  planted: true,
  duration: 3.4,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    { t: 0.42, pose: STAND_SQUAT_BOTTOM },
    { t: 0.55, pose: STAND_SQUAT_BOTTOM },
    { t: 1, pose: {} },
  ],
};

const WALL_SIT_POSE = merge(
  { rootY: -0.36, rootZ: -0.06, head: { x: d(2) } },
  hips(-d(90), d(4)),
  knees(d(90)),
  arms(-d(14)),
  elbows(-d(88)),
);

const wallSit: ExerciseClip = {
  planted: true,
  duration: 4,
  base: WALL_SIT_POSE,
  keys: [
    { t: 0, pose: { chest: { x: -d(1) } } },
    { t: 0.5, pose: { chest: { x: d(2) }, head: { x: -d(2) } } },
    { t: 1, pose: { chest: { x: -d(1) } } },
  ],
};

// rootY values are offsets from standing pelvis height (0.98m), so floor
// positions sit around -0.5 to -0.9.
const PUSHUP_BASE = merge(
  { rootRX: d(84) },
  hips(d(4)),
  ankles(d(64)),
  { head: { x: -d(20) } },
);

const pushup: ExerciseClip = {
  duration: 2.8,
  base: PUSHUP_BASE,
  keys: [
    { t: 0, pose: merge({ rootY: -0.53 }, arms(-d(86), d(12)), elbows(-d(12))) },
    { t: 0.45, pose: merge({ rootY: -0.73 }, arms(-d(58), d(34)), elbows(-d(88))) },
    { t: 0.58, pose: merge({ rootY: -0.73 }, arms(-d(58), d(34)), elbows(-d(88))) },
    { t: 1, pose: merge({ rootY: -0.53 }, arms(-d(86), d(12)), elbows(-d(12))) },
  ],
};

// Alternating reverse lunge: right leg steps back in the first half, left in the second.
function lungeHalf(back: "L" | "R"): PartialPose {
  const backLeg = back === "L"
    ? { hipL: { x: d(26) }, kneeL: d(96), ankleL: d(50) }
    : { hipR: { x: d(26) }, kneeR: d(96), ankleR: d(50) };
  const frontLeg = back === "L"
    ? { hipR: { x: -d(72) }, kneeR: d(82) }
    : { hipL: { x: -d(72) }, kneeL: d(82) };
  return merge(
    { rootY: -0.3, torso: { x: -d(8) } },
    backLeg,
    frontLeg,
    arms(-d(10)),
    elbows(-d(30)),
  );
}

const lunge: ExerciseClip = {
  planted: true,
  duration: 4.6,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    { t: 0.22, pose: lungeHalf("R") },
    { t: 0.31, pose: lungeHalf("R") },
    { t: 0.5, pose: {} },
    { t: 0.72, pose: lungeHalf("L") },
    { t: 0.81, pose: lungeHalf("L") },
    { t: 1, pose: {} },
  ],
};

const STEP_TOP = merge(
  { rootY: 0.28, rootZ: 0.16, torso: { x: -d(4) } },
  { hipR: { x: -d(10) }, kneeR: d(6) },
  { hipL: { x: -d(28) }, kneeL: d(48), ankleL: d(12) },
  arms(-d(16)),
  elbows(-d(42)),
);

const stepUp: ExerciseClip = {
  duration: 3.6,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    {
      t: 0.24,
      pose: merge(
        { rootY: -0.04, torso: { x: -d(10) } },
        { hipR: { x: -d(88) }, kneeR: d(84), ankleR: -d(10) },
        arms(-d(24)),
        elbows(-d(36)),
      ),
    },
    { t: 0.5, pose: STEP_TOP },
    { t: 0.6, pose: STEP_TOP },
    { t: 1, pose: {} },
  ],
};

const PLANK_BASE = merge(
  { rootRX: d(86), rootY: -0.72, head: { x: -d(16) } },
  arms(-d(88), d(4)),
  elbows(-d(90)),
  hips(d(4)),
  ankles(d(64)),
);

const plank: ExerciseClip = {
  duration: 4,
  base: PLANK_BASE,
  keys: [
    { t: 0, pose: { chest: { x: -d(1) } } },
    { t: 0.5, pose: { chest: { x: d(2) } } },
    { t: 1, pose: { chest: { x: -d(1) } } },
  ],
};

const CLIMBER_BASE = merge(
  { rootRX: d(80), rootY: -0.55, head: { x: -d(14) } },
  arms(-d(86), d(10)),
  elbows(-d(8)),
  ankles(d(60)),
);

const mountainClimber: ExerciseClip = {
  duration: 1.1,
  base: CLIMBER_BASE,
  keys: [
    { t: 0, pose: { hipL: { x: -d(96) }, kneeL: d(112), hipR: { x: d(6) }, kneeR: d(8) } },
    { t: 0.5, pose: { hipR: { x: -d(96) }, kneeR: d(112), hipL: { x: d(6) }, kneeL: d(8) } },
    { t: 1, pose: { hipL: { x: -d(96) }, kneeL: d(112), hipR: { x: d(6) }, kneeR: d(8) } },
  ],
};

const DEADBUG_BASE = merge(
  { rootRX: -d(90), rootY: -0.85 },
  { head: { x: d(10) } },
);

const deadBug: ExerciseClip = {
  duration: 3.6,
  base: DEADBUG_BASE,
  keys: [
    {
      t: 0,
      pose: merge(arms(-d(90)), elbows(-d(6)), hips(-d(90)), knees(d(90))),
    },
    {
      t: 0.28,
      pose: merge(
        { shoulderL: { x: -d(168) }, elbowL: -d(6), shoulderR: { x: -d(90) }, elbowR: -d(6) },
        { hipR: { x: -d(14) }, kneeR: d(8), hipL: { x: -d(90) }, kneeL: d(90) },
      ),
    },
    { t: 0.5, pose: merge(arms(-d(90)), elbows(-d(6)), hips(-d(90)), knees(d(90))) },
    {
      t: 0.78,
      pose: merge(
        { shoulderR: { x: -d(168) }, elbowR: -d(6), shoulderL: { x: -d(90) }, elbowL: -d(6) },
        { hipL: { x: -d(14) }, kneeL: d(8), hipR: { x: -d(90) }, kneeR: d(90) },
      ),
    },
    { t: 1, pose: merge(arms(-d(90)), elbows(-d(6)), hips(-d(90)), knees(d(90))) },
  ],
};

const QUAD_BASE = merge(
  { rootRX: d(88), rootY: -0.46, head: { x: -d(22) } },
  arms(-d(88), d(4)),
  elbows(-d(4)),
  hips(-d(4)),
  knees(d(92)),
  ankles(d(30)),
);

const birdDog: ExerciseClip = {
  duration: 4.2,
  base: QUAD_BASE,
  keys: [
    { t: 0, pose: {} },
    {
      t: 0.22,
      pose: {
        shoulderR: { x: -d(176), z: d(4) },
        elbowR: -d(4),
        hipL: { x: d(4) },
        kneeL: d(4),
      },
    },
    {
      t: 0.36,
      pose: {
        shoulderR: { x: -d(176), z: d(4) },
        elbowR: -d(4),
        hipL: { x: d(4) },
        kneeL: d(4),
      },
    },
    { t: 0.5, pose: {} },
    {
      t: 0.72,
      pose: {
        shoulderL: { x: -d(176), z: -d(4) },
        elbowL: -d(4),
        hipR: { x: d(4) },
        kneeR: d(4),
      },
    },
    {
      t: 0.86,
      pose: {
        shoulderL: { x: -d(176), z: -d(4) },
        elbowL: -d(4),
        hipR: { x: d(4) },
        kneeR: d(4),
      },
    },
    { t: 1, pose: {} },
  ],
};

const HOLLOW_BASE = merge(
  { rootRX: -d(82), rootY: -0.83, chest: { x: -d(14) }, head: { x: d(26) } },
  arms(-d(160), d(8)),
  elbows(-d(4)),
  hips(-d(26)),
  knees(d(6)),
);

const hollowHold: ExerciseClip = {
  duration: 4,
  base: HOLLOW_BASE,
  keys: [
    { t: 0, pose: { hipL: { x: -d(24) }, hipR: { x: -d(24) } } },
    { t: 0.5, pose: { hipL: { x: -d(30) }, hipR: { x: -d(30) } } },
    { t: 1, pose: { hipL: { x: -d(24) }, hipR: { x: -d(24) } } },
  ],
};

const PRESS_RACK = merge(arms(0, d(78)), elbows(-d(112)), { head: { x: -d(2) } });
const PRESS_TOP = merge(arms(0, d(168)), elbows(-d(8)), { head: { x: -d(6) } });

const shoulderPress: ExerciseClip = {
  planted: true,
  duration: 3.2,
  base: RELAXED,
  keys: [
    { t: 0, pose: PRESS_RACK },
    { t: 0.42, pose: PRESS_TOP },
    { t: 0.52, pose: PRESS_TOP },
    { t: 1, pose: PRESS_RACK },
  ],
};

const BENCH_BASE = merge(
  // Supine on the flat bench, feet planted either side.
  { rootRX: -d(90), rootY: -0.485, head: { x: d(6) } },
  { hipL: { x: -d(64), z: -d(14) }, hipR: { x: -d(64), z: d(14) } },
  knees(d(116)),
  ankles(d(12)),
);

const benchPress: ExerciseClip = {
  duration: 3.2,
  base: BENCH_BASE,
  keys: [
    { t: 0, pose: merge(arms(-d(84), d(10)), elbows(-d(8))) },
    { t: 0.44, pose: merge(arms(-d(38), d(58)), elbows(-d(86))) },
    { t: 0.56, pose: merge(arms(-d(38), d(58)), elbows(-d(86))) },
    { t: 1, pose: merge(arms(-d(84), d(10)), elbows(-d(8))) },
  ],
};

const ROW_BASE = merge(
  { rootY: -0.1, torso: { x: -d(42) }, chest: { x: -d(6) }, head: { x: d(30) } },
  hips(-d(28)),
  knees(d(28)),
);

const row: ExerciseClip = {
  planted: true,
  duration: 3,
  base: ROW_BASE,
  keys: [
    { t: 0, pose: merge(arms(-d(44)), elbows(-d(8))) },
    { t: 0.42, pose: merge(arms(d(8), d(16)), elbows(-d(94))) },
    { t: 0.54, pose: merge(arms(d(8), d(16)), elbows(-d(94))) },
    { t: 1, pose: merge(arms(-d(44)), elbows(-d(8))) },
  ],
};

const curl: ExerciseClip = {
  planted: true,
  duration: 2.9,
  base: RELAXED,
  keys: [
    { t: 0, pose: elbows(-d(12)) },
    { t: 0.42, pose: elbows(-d(128)) },
    { t: 0.52, pose: elbows(-d(128)) },
    { t: 1, pose: elbows(-d(12)) },
  ],
};

const TRI_BASE = merge(arms(0, d(166)), { head: { x: -d(4) } });

const tricepsExtension: ExerciseClip = {
  planted: true,
  duration: 2.9,
  base: TRI_BASE,
  keys: [
    { t: 0, pose: elbows(-d(108)) },
    { t: 0.44, pose: elbows(-d(10)) },
    { t: 0.54, pose: elbows(-d(10)) },
    { t: 1, pose: elbows(-d(108)) },
  ],
};

// Bench dips: back to the bench, hands on its edge behind the hips.
const DIP_BASE = merge(
  { rootZ: 0.18, torso: { x: d(6) } },
  arms(d(38)),
  { hipL: { x: -d(66) }, hipR: { x: -d(66) } },
  knees(d(38)),
  ankles(d(10)),
);

const dip: ExerciseClip = {
  duration: 3,
  base: DIP_BASE,
  keys: [
    { t: 0, pose: merge({ rootY: -0.58 }, elbows(-d(10))) },
    { t: 0.45, pose: merge({ rootY: -0.7 }, elbows(-d(86))) },
    { t: 0.56, pose: merge({ rootY: -0.7 }, elbows(-d(86))) },
    { t: 1, pose: merge({ rootY: -0.58 }, elbows(-d(10))) },
  ],
};

const lateralRaise: ExerciseClip = {
  planted: true,
  duration: 3,
  base: merge(RELAXED, elbows(-d(14))),
  keys: [
    { t: 0, pose: arms(0, d(10)) },
    { t: 0.44, pose: arms(0, d(86)) },
    { t: 0.54, pose: arms(0, d(86)) },
    { t: 1, pose: arms(0, d(10)) },
  ],
};

const HINGE_BOTTOM = merge(
  // Hips travel back, shins stay near vertical, arms hang plumb to the floor.
  { rootZ: -0.17, torso: { x: -d(68) }, chest: { x: -d(6) }, head: { x: d(46) } },
  hips(-d(20)),
  knees(d(14)),
  ankles(d(6)),
  arms(-d(74)),
  elbows(-d(4)),
);

const hinge: ExerciseClip = {
  planted: true,
  duration: 3.6,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    { t: 0.44, pose: HINGE_BOTTOM },
    { t: 0.56, pose: HINGE_BOTTOM },
    { t: 1, pose: {} },
  ],
};

const swing: ExerciseClip = {
  planted: true,
  duration: 1.5,
  base: elbows(-d(4)),
  keys: [
    {
      t: 0,
      pose: merge(
        { rootZ: -0.14, torso: { x: -d(54) }, head: { x: d(36) } },
        hips(-d(26)),
        knees(d(24)),
        arms(-d(48)),
      ),
    },
    {
      t: 0.5,
      pose: merge(
        { torso: { x: -d(2) }, head: { x: 0 } },
        hips(-d(2)),
        knees(d(2)),
        arms(-d(92)),
      ),
    },
    {
      t: 1,
      pose: merge(
        { rootZ: -0.14, torso: { x: -d(54) }, head: { x: d(36) } },
        hips(-d(26)),
        knees(d(24)),
        arms(-d(48)),
      ),
    },
  ],
};

const BRIDGE_BASE = merge(
  { rootRX: -d(90), rootY: -0.85 },
  arms(d(12), d(16)),
  knees(d(108)),
  ankles(d(8)),
);

const bridge: ExerciseClip = {
  duration: 3.2,
  base: BRIDGE_BASE,
  keys: [
    { t: 0, pose: merge({ rootY: -0.85 }, { chest: { x: 0 } }, hips(-d(58))) },
    {
      t: 0.42,
      pose: merge({ rootY: -0.68, rootZ: 0.04 }, { chest: { x: d(26) } }, hips(-d(6))),
    },
    { t: 0.56, pose: merge({ rootY: -0.68, rootZ: 0.04 }, { chest: { x: d(26) } }, hips(-d(6))) },
    { t: 1, pose: merge({ rootY: -0.85 }, { chest: { x: 0 } }, hips(-d(58))) },
  ],
};

// Hanging pull-up under the bar (bar sits at PULLUP_BAR_Y in the prop file).
const PULL_BASE = merge({ head: { x: -d(8) } }, hips(d(6)), knees(d(24)));

const pull: ExerciseClip = {
  duration: 3.4,
  base: PULL_BASE,
  keys: [
    { t: 0, pose: merge({ rootY: 0.34 }, arms(0, d(162)), elbows(-d(12))) },
    { t: 0.42, pose: merge({ rootY: 0.7 }, arms(0, d(118)), elbows(-d(118))) },
    { t: 0.52, pose: merge({ rootY: 0.7 }, arms(0, d(118)), elbows(-d(118))) },
    { t: 1, pose: merge({ rootY: 0.34 }, arms(0, d(162)), elbows(-d(12))) },
  ],
};

// Seated lat pulldown at the machine: wide overhead grip, bar pulled to the
// upper chest with a slight lean back.
const PULLDOWN_BASE = merge(
  { rootY: -0.48, torso: { x: d(6) }, head: { x: -d(6) } },
  hips(-d(84)),
  knees(d(80)),
  ankles(d(4)),
);

const pulldown: ExerciseClip = {
  duration: 3.2,
  base: PULLDOWN_BASE,
  keys: [
    { t: 0, pose: merge(arms(-d(14), d(148)), elbows(-d(14))) },
    { t: 0.42, pose: merge(arms(-d(6), d(96)), elbows(-d(102))) },
    { t: 0.54, pose: merge(arms(-d(6), d(96)), elbows(-d(102))) },
    { t: 1, pose: merge(arms(-d(14), d(148)), elbows(-d(14))) },
  ],
};

function runPose(lead: "L" | "R", bounce: number): PartialPose {
  const fwd = lead === "L" ? "hipL" : "hipR";
  const back = lead === "L" ? "hipR" : "hipL";
  const fwdKnee = lead === "L" ? "kneeL" : "kneeR";
  const backKnee = lead === "L" ? "kneeR" : "kneeL";
  const armFwd = lead === "L" ? "shoulderR" : "shoulderL";
  const armBack = lead === "L" ? "shoulderL" : "shoulderR";
  return {
    rootY: bounce,
    torso: { x: -d(6) },
    [fwd]: { x: -d(46) },
    [fwdKnee]: d(58),
    [back]: { x: d(22) },
    [backKnee]: d(38),
    [armFwd]: { x: -d(42) },
    [armBack]: { x: d(32) },
    elbowL: -d(74),
    elbowR: -d(74),
  } as PartialPose;
}

const run: ExerciseClip = {
  planted: true,
  duration: 0.85,
  base: RELAXED,
  keys: [
    { t: 0, pose: runPose("L", 0.02) },
    { t: 0.25, pose: merge(runPose("L", 0.05), { torso: { x: -d(7) } }) },
    { t: 0.5, pose: runPose("R", 0.02) },
    { t: 0.75, pose: merge(runPose("R", 0.05), { torso: { x: -d(7) } }) },
    { t: 1, pose: runPose("L", 0.02) },
  ],
};

const JACK_CLOSED = merge(arms(0, d(8)), elbows(-d(8)), hips(0, d(2)), { rootY: 0 });
const JACK_OPEN = merge(arms(0, d(158)), elbows(-d(10)), hips(0, d(26)), { rootY: 0.05 });

const jumpingJack: ExerciseClip = {
  duration: 1.1,
  base: RELAXED,
  keys: [
    { t: 0, pose: JACK_CLOSED },
    { t: 0.25, pose: merge(arms(0, d(84)), elbows(-d(8)), hips(0, d(14)), { rootY: 0.1 }) },
    { t: 0.5, pose: JACK_OPEN },
    { t: 0.75, pose: merge(arms(0, d(84)), elbows(-d(8)), hips(0, d(14)), { rootY: 0.1 }) },
    { t: 1, pose: JACK_CLOSED },
  ],
};

const BURPEE_CROUCH = merge(
  { rootY: -0.62, torso: { x: -d(34) }, head: { x: d(22) } },
  hips(-d(112)),
  knees(d(124)),
  ankles(-d(12)),
  arms(-d(74)),
  elbows(-d(10)),
);

const burpee: ExerciseClip = {
  duration: 2.9,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    { t: 0.14, pose: BURPEE_CROUCH },
    {
      t: 0.32,
      pose: merge(
        { rootRX: d(82), rootY: -0.55, head: { x: -d(14) } },
        arms(-d(86), d(10)),
        elbows(-d(10)),
        hips(d(4)),
        ankles(d(60)),
      ),
    },
    {
      t: 0.46,
      pose: merge(
        { rootRX: d(82), rootY: -0.55, head: { x: -d(14) } },
        arms(-d(86), d(10)),
        elbows(-d(10)),
        hips(d(4)),
        ankles(d(60)),
      ),
    },
    { t: 0.62, pose: BURPEE_CROUCH },
    { t: 0.8, pose: merge({ rootY: 0.22 }, arms(0, d(160)), elbows(-d(8))) },
    { t: 0.92, pose: merge({ rootY: -0.06 }, arms(0, d(24)), elbows(-d(14)), knees(d(20)), hips(-d(14))) },
    { t: 1, pose: {} },
  ],
};

const TWIST_BASE = merge(
  // Seated on the mat, leaning back, feet just off the floor.
  { rootRX: -d(38), rootY: -0.84, chest: { x: d(4) }, head: { x: d(30) } },
  hips(-d(74)),
  knees(d(64)),
  arms(-d(78)),
  elbows(-d(46)),
);

const twist: ExerciseClip = {
  duration: 1.9,
  base: TWIST_BASE,
  keys: [
    { t: 0, pose: { chest: { y: d(34) }, head: { y: -d(12) } } },
    { t: 0.5, pose: { chest: { y: -d(34) }, head: { y: d(12) } } },
    { t: 1, pose: { chest: { y: d(34) }, head: { y: -d(12) } } },
  ],
};

// Standing dynamic flow: hip-opener lunge with an overhead reach, both sides.
function stretchSide(side: "L" | "R"): PartialPose {
  const backHip = side === "L" ? "hipL" : "hipR";
  const backKnee = side === "L" ? "kneeL" : "kneeR";
  const frontHip = side === "L" ? "hipR" : "hipL";
  const frontKnee = side === "L" ? "kneeR" : "kneeL";
  const reachArm = side === "L" ? "shoulderL" : "shoulderR";
  const zSign = side === "L" ? -1 : 1;
  return {
    rootY: -0.2,
    torso: { x: -d(6), z: zSign * -d(10) },
    [backHip]: { x: d(22) },
    [backKnee]: d(58),
    [frontHip]: { x: -d(58) },
    [frontKnee]: d(64),
    [reachArm]: { x: 0, z: zSign * d(158) },
    elbowL: -d(8),
    elbowR: -d(8),
  } as PartialPose;
}

const stretch: ExerciseClip = {
  planted: true,
  duration: 5.2,
  base: RELAXED,
  keys: [
    { t: 0, pose: {} },
    { t: 0.2, pose: stretchSide("R") },
    { t: 0.38, pose: stretchSide("R") },
    { t: 0.5, pose: {} },
    { t: 0.7, pose: stretchSide("L") },
    { t: 0.88, pose: stretchSide("L") },
    { t: 1, pose: {} },
  ],
};

const kickback: ExerciseClip = {
  duration: 2.6,
  base: QUAD_BASE,
  keys: [
    { t: 0, pose: {} },
    { t: 0.42, pose: { hipR: { x: d(12) }, kneeR: d(14) } },
    { t: 0.54, pose: { hipR: { x: d(12) }, kneeR: d(14) } },
    { t: 1, pose: {} },
  ],
};

const idle: ExerciseClip = {
  planted: true,
  duration: 3.6,
  base: RELAXED,
  keys: [
    { t: 0, pose: { chest: { x: 0 } } },
    { t: 0.5, pose: { chest: { x: d(2.5) }, rootY: 0.008 } },
    { t: 1, pose: { chest: { x: 0 } } },
  ],
};

export const CLIPS: Record<ClipKey, ExerciseClip> = {
  idle, squat, wallSit, pushup, lunge, stepUp, plank, mountainClimber,
  deadBug, birdDog, hollowHold, shoulderPress, benchPress, row, curl,
  tricepsExtension, dip, lateralRaise, hinge, swing, bridge, pull, pulldown,
  run, jumpingJack, burpee, twist, stretch, kickback,
};

/* ------------------------------ clip resolution ---------------------------- */

const ANIMATION_TO_CLIP: Record<AnimationType, ClipKey> = {
  squat: "squat",
  pushup: "pushup",
  lunge: "lunge",
  plank: "plank",
  shoulderPress: "shoulderPress",
  benchPress: "benchPress",
  row: "row",
  curl: "curl",
  tricepsExtension: "tricepsExtension",
  lateralRaise: "lateralRaise",
  hinge: "hinge",
  bridge: "bridge",
  pull: "pull",
  run: "run",
  jump: "jumpingJack",
  twist: "twist",
  stretch: "stretch",
  kickback: "kickback",
  idle: "idle",
};

// Name-level refinements on top of the coarse AnimationType.
export function resolveClip(animation: AnimationType, exerciseText: string): ClipKey {
  const s = exerciseText.toLowerCase();
  if (s.includes("wall sit") || s.includes("wall-sit")) return "wallSit";
  if (s.includes("climber")) return "mountainClimber";
  if (s.includes("dead bug") || s.includes("deadbug")) return "deadBug";
  if (s.includes("bird")) return "birdDog";
  if (s.includes("hollow")) return "hollowHold";
  if (s.includes("burpee")) return "burpee";
  if (s.includes("swing")) return "swing";
  if (s.includes("pulldown") || s.includes("pull-down") || s.includes("pull down")) return "pulldown";
  if (s.includes("step up") || s.includes("step-up") || s.includes("step ")) return "stepUp";
  if (s.includes("dip")) return "dip";
  return ANIMATION_TO_CLIP[animation] ?? "idle";
}

export function resolveHeldProp(clip: ClipKey, equipment?: DemoEquipment): HeldProp {
  if (clip === "swing") return "kettlebell";
  if (clip === "pulldown") return "cableBar";
  if (equipment === "dumbbells" || equipment === "dumbbellBench") return "dumbbells";
  if (equipment === "barbellBench") return "barbell";
  if (equipment === "cableMachine") {
    // Rendered as dumbbell handles so hands are never empty on cable moves.
    return clip === "pull" ? "none" : "dumbbells";
  }
  return "none";
}

/* --------------------------------- sampling -------------------------------- */

const flatCache = new Map<ExerciseClip, { t: number; pose: FlatPose }[]>();

function flatKeys(clip: ExerciseClip) {
  let keys = flatCache.get(clip);
  if (!keys) {
    keys = clip.keys.map((k) => ({ t: k.t, pose: flatten(clip.base, k.pose) }));
    flatCache.set(clip, keys);
  }
  return keys;
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export function samplePose(clip: ExerciseClip, phase: number, out: FlatPose): FlatPose {
  const keys = flatKeys(clip);
  const p = ((phase % 1) + 1) % 1;

  let next = keys.findIndex((k) => k.t > p);
  if (next === -1) next = keys.length - 1;
  const prev = Math.max(0, next - 1);
  const span = Math.max(1e-5, keys[next].t - keys[prev].t);
  const u = easeInOutSine(Math.min(1, Math.max(0, (p - keys[prev].t) / span)));

  const a = keys[prev].pose;
  const b = keys[next].pose;
  for (const c of CHANNELS) out[c] = a[c] + (b[c] - a[c]) * u;
  return out;
}

export function emptyFlatPose(): FlatPose {
  return Object.fromEntries(CHANNELS.map((c) => [c, 0])) as FlatPose;
}
