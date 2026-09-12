import * as THREE from "three";
import type { ExerciseAnimationConfig, ViewPreset } from "./exerciseSceneConfig";

type CameraFit = {
  distance: number;
  fov: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
};

function normalizeDirection(direction: [number, number, number]) {
  const vector = new THREE.Vector3(...direction);
  if (vector.lengthSq() === 0) return new THREE.Vector3(0, 0.32, 1).normalize();
  return vector.normalize();
}

export function calculateCameraFit({
  config,
  view,
  aspect,
}: {
  config: ExerciseAnimationConfig;
  view: ViewPreset;
  aspect: number;
}): CameraFit {
  const preset = config.cameraPresets[view];
  const fov = preset.fov;
  const fovRad = THREE.MathUtils.degToRad(fov);
  const [boxWidth, boxHeight, boxDepth] = config.fitBox.size;
  // The viewer overlays a muscle legend along the top and a control bar along
  // the bottom, so the athlete has less usable height than the canvas suggests.
  // Framing to the raw canvas clipped heads and feet, worst of all on phones
  // where the frame is portrait; both allowances are applied to height only.
  const chromeAllowance = 1.14;
  const portraitAllowance = aspect < 1 ? 1 + (1 - Math.max(0.4, aspect)) * 0.35 : 1;
  const paddedWidth = boxWidth * config.fitBox.padding;
  const paddedHeight = boxHeight * config.fitBox.padding * chromeAllowance * portraitAllowance;
  const verticalDistance = paddedHeight / 2 / Math.tan(fovRad / 2);
  const horizontalFov = 2 * Math.atan(Math.tan(fovRad / 2) * Math.max(0.1, aspect));
  const horizontalDistance = paddedWidth / 2 / Math.tan(horizontalFov / 2);
  const depthDistance = boxDepth * 0.56 * config.fitBox.padding;
  const distance = Math.max(verticalDistance, horizontalDistance, depthDistance);
  const target = new THREE.Vector3(...config.fitBox.center);
  const direction = normalizeDirection(preset.direction);

  return {
    distance,
    fov,
    target,
    position: target.clone().add(direction.multiplyScalar(distance)),
  };
}

export function cameraControlLimits(config: ExerciseAnimationConfig, distance: number) {
  return {
    minDistance: Math.max(0.9, distance * config.orbit.minDistanceScale),
    maxDistance: Math.max(2.2, distance * config.orbit.maxDistanceScale),
  };
}
