// Procedural gym equipment for the Sora demo scenes. Everything is built from
// primitives — no external model files.

import { useMemo } from "react";
import * as THREE from "three";

export type ScenePropKind =
  | "bench"
  | "benchBehind"
  | "pullupBar"
  | "cableColumn"
  | "pulldownMachine"
  | "stepBox"
  | "mat"
  | "wall";

function useGymMaterials() {
  return useMemo(
    () => ({
      rubber: new THREE.MeshStandardMaterial({ color: "#0a0d12", roughness: 0.62, metalness: 0.08 }),
      metal: new THREE.MeshStandardMaterial({ color: "#8a939f", roughness: 0.24, metalness: 0.85 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: "#2a2f38", roughness: 0.42, metalness: 0.6 }),
      pad: new THREE.MeshStandardMaterial({ color: "#1c222d", roughness: 0.72, metalness: 0.02 }),
      accent: new THREE.MeshStandardMaterial({ color: "#39424f", roughness: 0.5, metalness: 0.3 }),
      matTop: new THREE.MeshStandardMaterial({ color: "#141a24", roughness: 0.85, metalness: 0 }),
    }),
    [],
  );
}

/* ------------------------------- hand-held props ----------------------------- */

export function DumbbellProp({ scale = 1 }: { scale?: number }) {
  const m = useGymMaterials();
  return (
    <group scale={scale} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow material={m.metal}>
        <cylinderGeometry args={[0.016, 0.016, 0.24, 16]} />
      </mesh>
      {[-0.1, 0.1].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh castShadow material={m.rubber}>
            <cylinderGeometry args={[0.062, 0.062, 0.058, 22]} />
          </mesh>
          <mesh castShadow material={m.rubber} position={[0, y > 0 ? 0.042 : -0.042, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.03, 22]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function KettlebellProp({ scale = 1 }: { scale?: number }) {
  const m = useGymMaterials();
  return (
    <group scale={scale} position={[0, -0.1, 0]}>
      <mesh castShadow material={m.rubber}>
        <sphereGeometry args={[0.085, 20, 16]} />
      </mesh>
      <mesh castShadow material={m.darkMetal} position={[0, 0.095, 0]}>
        <torusGeometry args={[0.05, 0.014, 12, 20, Math.PI]} />
      </mesh>
    </group>
  );
}

export function BarbellProp({ scale = 1 }: { scale?: number }) {
  const m = useGymMaterials();
  return (
    <group scale={scale} rotation={[0, 0, Math.PI / 2]}>
      {/* bar along local Y; parent rotates it along X between the hands */}
      <mesh castShadow material={m.metal}>
        <cylinderGeometry args={[0.015, 0.015, 1.55, 16]} />
      </mesh>
      {[-0.66, 0.66].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh castShadow material={m.rubber}>
            <cylinderGeometry args={[0.11, 0.11, 0.05, 26]} />
          </mesh>
          <mesh castShadow material={m.rubber} position={[0, y > 0 ? 0.045 : -0.045, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.035, 26]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Straight cable-attachment bar (lat pulldown). The short cable stub rises
// toward the overhead pulley; the whole prop follows the hands.
export function CableBarProp({ scale = 1 }: { scale?: number }) {
  const m = useGymMaterials();
  return (
    <group scale={scale}>
      <mesh castShadow material={m.metal} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 1.05, 14]} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} castShadow material={m.rubber} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
        </mesh>
      ))}
      <mesh material={m.darkMetal} position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.85, 8]} />
      </mesh>
    </group>
  );
}

/* -------------------------------- static props ------------------------------- */

export const PULLUP_BAR_Y = 2.35;

function FlatBench({ z = -0.28 }: { z?: number }) {
  const m = useGymMaterials();
  return (
    <group position={[0, 0, z]}>
      <mesh castShadow receiveShadow material={m.pad} position={[0, 0.345, 0]}>
        <boxGeometry args={[0.34, 0.07, 1.18]} />
      </mesh>
      {[-0.45, 0.45].map((zz) => (
        <mesh key={zz} castShadow material={m.darkMetal} position={[0, 0.16, zz]}>
          <boxGeometry args={[0.26, 0.31, 0.06]} />
        </mesh>
      ))}
      <mesh castShadow material={m.darkMetal} position={[0, 0.05, 0]}>
        <boxGeometry args={[0.12, 0.05, 1.0]} />
      </mesh>
    </group>
  );
}

function PullupBar() {
  const m = useGymMaterials();
  return (
    <group>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} castShadow material={m.darkMetal} position={[x, PULLUP_BAR_Y / 2, 0]}>
          <boxGeometry args={[0.07, PULLUP_BAR_Y, 0.07]} />
        </mesh>
      ))}
      <mesh castShadow material={m.metal} position={[0, PULLUP_BAR_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.017, 0.017, 1.2, 16]} />
      </mesh>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} castShadow receiveShadow material={m.rubber} position={[x, 0.02, 0]}>
          <boxGeometry args={[0.3, 0.04, 0.3]} />
        </mesh>
      ))}
    </group>
  );
}

function CableColumn() {
  const m = useGymMaterials();
  return (
    <group position={[0, 0, 1.15]} rotation={[0, Math.PI, 0]}>
      <mesh castShadow receiveShadow material={m.darkMetal} position={[0, 1.05, 0]}>
        <boxGeometry args={[0.34, 2.1, 0.22]} />
      </mesh>
      <mesh castShadow material={m.accent} position={[0, 1.05, 0.13]}>
        <boxGeometry args={[0.2, 1.7, 0.05]} />
      </mesh>
      <mesh castShadow material={m.metal} position={[0, 1.28, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.05, 18]} />
      </mesh>
      <mesh castShadow receiveShadow material={m.rubber} position={[0, 0.03, 0.1]}>
        <boxGeometry args={[0.44, 0.06, 0.5]} />
      </mesh>
    </group>
  );
}

// Lat pulldown station: weight-stack column in front, overhead arm with a
// pulley above the athlete's head, seat with a thigh pad under them.
function PulldownMachine() {
  const m = useGymMaterials();
  return (
    <group>
      {/* seat + thigh pad (athlete sits at the origin) */}
      <mesh castShadow receiveShadow material={m.pad} position={[0, 0.44, 0.02]}>
        <boxGeometry args={[0.4, 0.07, 0.42]} />
      </mesh>
      <mesh castShadow material={m.darkMetal} position={[0, 0.22, 0]}>
        <boxGeometry args={[0.12, 0.38, 0.12]} />
      </mesh>
      <mesh castShadow material={m.pad} position={[0, 0.72, 0.34]}>
        <boxGeometry args={[0.38, 0.09, 0.16]} />
      </mesh>
      {/* weight-stack column in front */}
      <group position={[0, 0, 0.95]}>
        <mesh castShadow receiveShadow material={m.darkMetal} position={[0, 1.1, 0]}>
          <boxGeometry args={[0.5, 2.2, 0.28]} />
        </mesh>
        <mesh castShadow material={m.accent} position={[0, 0.75, -0.16]}>
          <boxGeometry args={[0.34, 1.1, 0.06]} />
        </mesh>
        <mesh castShadow receiveShadow material={m.rubber} position={[0, 0.03, -0.1]}>
          <boxGeometry args={[0.6, 0.06, 0.7]} />
        </mesh>
      </group>
      {/* overhead arm reaching back over the head + pulley */}
      <mesh castShadow material={m.darkMetal} position={[0, 2.24, 0.5]}>
        <boxGeometry args={[0.1, 0.09, 1.15]} />
      </mesh>
      <mesh castShadow material={m.metal} position={[0, 2.16, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
      </mesh>
    </group>
  );
}

function StepBox() {
  const m = useGymMaterials();
  return (
    <group position={[0, 0, 0.34]}>
      <mesh castShadow receiveShadow material={m.pad} position={[0, 0.15, 0]}>
        <boxGeometry args={[0.56, 0.3, 0.42]} />
      </mesh>
      <mesh material={m.accent} position={[0, 0.302, 0]}>
        <boxGeometry args={[0.57, 0.008, 0.43]} />
      </mesh>
    </group>
  );
}

function FloorMat() {
  const m = useGymMaterials();
  return (
    <mesh receiveShadow material={m.matTop} position={[0, 0.012, -0.1]}>
      <boxGeometry args={[1.05, 0.022, 2.15]} />
    </mesh>
  );
}

function Wall() {
  const m = useGymMaterials();
  return (
    <mesh receiveShadow material={m.pad} position={[0, 1.1, -0.28]}>
      <boxGeometry args={[1.5, 2.2, 0.08]} />
    </mesh>
  );
}

export function SceneProps({ props }: { props: ScenePropKind[] }) {
  return (
    <>
      {props.map((kind) => {
        switch (kind) {
          case "bench":
            return <FlatBench key={kind} />;
          case "benchBehind":
            return <FlatBench key={kind} z={-0.42} />;
          case "pullupBar":
            return <PullupBar key={kind} />;
          case "cableColumn":
            return <CableColumn key={kind} />;
          case "pulldownMachine":
            return <PulldownMachine key={kind} />;
          case "stepBox":
            return <StepBox key={kind} />;
          case "mat":
            return <FloorMat key={kind} />;
          case "wall":
            return <Wall key={kind} />;
          default:
            return null;
        }
      })}
    </>
  );
}
