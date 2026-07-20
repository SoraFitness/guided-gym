import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ExerciseAnimationConfig, ViewPreset } from "./exerciseSceneConfig";
import { calculateCameraFit } from "./exerciseCameraFit";

export function ResponsiveExerciseCamera({
  config,
  view,
  resetToken,
  onFitChange,
}: {
  config: ExerciseAnimationConfig;
  view: ViewPreset;
  resetToken: number;
  onFitChange?: (fit: { distance: number; target: [number, number, number] }) => void;
}) {
  const { camera, size } = useThree();
  const transitionRef = useRef(1);
  const mountedRef = useRef(false);
  const aspect = Math.max(0.1, size.width / Math.max(1, size.height));
  const fit = useMemo(() => calculateCameraFit({ config, view, aspect }), [aspect, config, view]);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fit.fov;
      camera.near = Math.max(0.02, fit.distance / 80);
      camera.far = Math.max(30, fit.distance * 8);
      camera.updateProjectionMatrix();
    }

    if (!mountedRef.current) {
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      mountedRef.current = true;
      transitionRef.current = 1;
    } else {
      transitionRef.current = 0;
    }

    onFitChange?.({
      distance: fit.distance,
      target: fit.target.toArray() as [number, number, number],
    });
  }, [camera, fit, onFitChange, resetToken]);

  useFrame((_, delta) => {
    if (transitionRef.current >= 1) return;

    const amount = 1 - Math.pow(0.02, delta * 3.4);
    camera.position.lerp(fit.position, amount);
    camera.lookAt(fit.target);
    transitionRef.current = Math.min(1, transitionRef.current + delta * 2.8);
  });

  return null;
}
