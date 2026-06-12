import { DEFAULT_POSE, type Pose } from "./AvatarModel";
import type { AnimationType } from "@/lib/exerciseCoaching";

/** triangle wave 0->1->0 */
function tri(t: number) {
  const x = t % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
}
/** smooth ease in/out */
function ease(t: number) {
  return t * t * (3 - 2 * t);
}

export function getPose(anim: AnimationType, time: number, speed = 1): Pose {
  // 1 cycle ~ 2.5s by default
  const t = (time * speed) / 2.5;
  const u = ease(tri(t));

  switch (anim) {
    case "squat": {
      return {
        ...DEFAULT_POSE,
        spine: 0.25 * u,
        hipY: -0.35 * u,
        leftHip: 0.9 * u,
        rightHip: 0.9 * u,
        leftKnee: -1.5 * u,
        rightKnee: -1.5 * u,
        leftShoulder: -0.4 - 0.6 * u,
        rightShoulder: -0.4 - 0.6 * u,
        leftElbow: 0.2,
        rightElbow: 0.2,
      };
    }
    case "pushup": {
      return {
        ...DEFAULT_POSE,
        rootRotX: -Math.PI / 2 + 0.05,
        rootY: 0.35 + 0.1 * u,
        leftShoulder: 1.4,
        rightShoulder: 1.4,
        leftElbow: 0.2 + 1.3 * u,
        rightElbow: 0.2 + 1.3 * u,
        leftHip: 0,
        rightHip: 0,
        leftKnee: -0.05,
        rightKnee: -0.05,
      };
    }
    case "lunge": {
      // step forward right leg, back leg knee bends
      return {
        ...DEFAULT_POSE,
        hipY: -0.25 * u,
        rightHip: 0.7 * u,
        rightKnee: -1.2 * u,
        leftHip: -0.4 * u,
        leftKnee: -1.2 * u,
        leftShoulder: -0.2,
        rightShoulder: -0.2,
        leftElbow: 0.6,
        rightElbow: 0.6,
      };
    }
    case "plank": {
      const breath = Math.sin(time * 1.5) * 0.02;
      return {
        ...DEFAULT_POSE,
        rootRotX: -Math.PI / 2 + 0.05,
        rootY: 0.45 + breath,
        leftShoulder: 1.4,
        rightShoulder: 1.4,
        leftElbow: 1.5,
        rightElbow: 1.5,
        leftKnee: -0.05,
        rightKnee: -0.05,
      };
    }
    case "shoulderPress": {
      // arms cycle from shoulders -> overhead
      return {
        ...DEFAULT_POSE,
        leftShoulder: -1.6 - 1.4 * u,
        rightShoulder: -1.6 - 1.4 * u,
        leftElbow: 1.6 - 1.4 * u,
        rightElbow: 1.6 - 1.4 * u,
      };
    }
    case "curl": {
      return {
        ...DEFAULT_POSE,
        leftShoulder: 0,
        rightShoulder: 0,
        leftElbow: 0.1 + 2.2 * u,
        rightElbow: 0.1 + 2.2 * u,
      };
    }
    case "idle":
    default: {
      const sway = Math.sin(time * 1.2) * 0.04;
      return {
        ...DEFAULT_POSE,
        spine: sway,
        leftShoulder: -0.1 + sway,
        rightShoulder: -0.1 - sway,
      };
    }
  }
}
