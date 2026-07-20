// Procedural Sora demo athlete: a fully code-built, jointed humanoid that
// plays the keyframe clips from exerciseClips.ts. No external model files.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DemoAvatarGender } from "@/lib/demoModel";
import type { MuscleKey } from "@/lib/exerciseCoaching";
import {
  CLIPS,
  emptyFlatPose,
  samplePose,
  type ClipKey,
  type FlatPose,
  type HeldProp,
} from "./exerciseClips";
import { DumbbellProp, KettlebellProp, BarbellProp, CableBarProp } from "./proceduralEquipment";

/* --------------------------------- body spec -------------------------------- */

interface BodySpec {
  scale: number;
  pelvisHeight: number;
  hipWidth: number;
  shoulderWidth: number;
  shoulderHeight: number; // above chest group origin
  torsoLift: number; // pelvis -> torso group
  chestLift: number; // torso -> chest group
  neckLift: number; // chest -> head group
  upperArm: { len: number; r: number };
  forearm: { len: number; r: number };
  thigh: { len: number; r: number };
  shin: { len: number; r: number };
  chestR: number;
  waistR: number;
  pelvisR: number;
  headR: number;
  female: boolean;
}

const MALE: BodySpec = {
  scale: 1,
  pelvisHeight: 0.98,
  hipWidth: 0.1,
  shoulderWidth: 0.21,
  shoulderHeight: 0.13,
  torsoLift: 0.1,
  chestLift: 0.2,
  neckLift: 0.24,
  upperArm: { len: 0.3, r: 0.047 },
  forearm: { len: 0.27, r: 0.039 },
  thigh: { len: 0.45, r: 0.072 },
  shin: { len: 0.44, r: 0.054 },
  chestR: 0.155,
  waistR: 0.125,
  pelvisR: 0.13,
  headR: 0.105,
  female: false,
};

const FEMALE: BodySpec = {
  scale: 0.94,
  pelvisHeight: 0.98,
  hipWidth: 0.105,
  shoulderWidth: 0.175,
  shoulderHeight: 0.125,
  torsoLift: 0.1,
  chestLift: 0.19,
  neckLift: 0.23,
  upperArm: { len: 0.28, r: 0.038 },
  forearm: { len: 0.25, r: 0.032 },
  thigh: { len: 0.44, r: 0.068 },
  shin: { len: 0.43, r: 0.047 },
  chestR: 0.135,
  waistR: 0.105,
  pelvisR: 0.135,
  headR: 0.1,
  female: true,
};

interface AthleteMaterials {
  skin: THREE.MeshStandardMaterial;
  top: THREE.MeshStandardMaterial;
  bottoms: THREE.MeshStandardMaterial;
  shoes: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
}

function useAthleteMaterials(female: boolean): AthleteMaterials {
  return useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({
        color: female ? "#c98d72" : "#a97256",
        roughness: 0.55,
        metalness: 0.02,
      }),
      top: new THREE.MeshStandardMaterial({
        color: female ? "#2c3550" : "#232c3a",
        roughness: 0.62,
        metalness: 0.04,
      }),
      bottoms: new THREE.MeshStandardMaterial({
        color: female ? "#171b26" : "#0d1017",
        roughness: 0.66,
        metalness: 0.03,
      }),
      shoes: new THREE.MeshStandardMaterial({
        color: "#e3e9f2",
        roughness: 0.4,
        metalness: 0.05,
      }),
      hair: new THREE.MeshStandardMaterial({
        color: female ? "#2a1a12" : "#151011",
        roughness: 0.75,
        metalness: 0.02,
      }),
    }),
    [female],
  );
}

/* ------------------------------ muscle highlights ---------------------------- */

// Worked muscles glow directly on the body: red shells for primary, amber for
// secondary. Zones are parented inside the joint groups so they move with it.
export type MuscleTone = "primary" | "secondary";
export type ToneOf = (muscle: MuscleKey) => MuscleTone | null;

function useHighlightMaterials() {
  return useMemo(
    () => ({
      primary: new THREE.MeshStandardMaterial({
        color: "#ff2038",
        emissive: "#e20022",
        emissiveIntensity: 1,
        roughness: 0.35,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
      secondary: new THREE.MeshStandardMaterial({
        color: "#ff7a2f",
        emissive: "#cf5200",
        emissiveIntensity: 0.5,
        roughness: 0.4,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    }),
    [],
  );
}

function Zone({
  material,
  position,
  scale,
  r = 0.06,
}: {
  material: THREE.Material;
  position: [number, number, number];
  scale: [number, number, number];
  r?: number;
}) {
  return (
    <mesh material={material} position={position} scale={scale}>
      <sphereGeometry args={[r, 18, 14]} />
    </mesh>
  );
}

/* ---------------------------------- limbs ----------------------------------- */

function Capsule({
  material,
  length,
  radius,
  offsetY,
  scaleX = 1,
  scaleZ = 1,
}: {
  material: THREE.Material;
  length: number;
  radius: number;
  offsetY: number;
  scaleX?: number;
  scaleZ?: number;
}) {
  return (
    <mesh castShadow receiveShadow material={material} position={[0, offsetY, 0]} scale={[scaleX, 1, scaleZ]}>
      <capsuleGeometry args={[radius, length, 6, 18]} />
    </mesh>
  );
}

type GroupRef = React.RefObject<THREE.Group | null>;

function Arm({
  spec,
  materials,
  side,
  held,
  toneOf,
  highlight,
  shoulderRef,
  elbowRef,
  handRef,
}: {
  spec: BodySpec;
  materials: AthleteMaterials;
  side: "L" | "R";
  held: HeldProp;
  toneOf: (muscle: MuscleKey) => THREE.Material | null;
  highlight: ReturnType<typeof useHighlightMaterials>;
  shoulderRef: GroupRef;
  elbowRef: GroupRef;
  handRef: GroupRef;
}) {
  const sign = side === "L" ? -1 : 1;
  const { upperArm, forearm } = spec;
  const frontDelt = toneOf("frontDelts");
  const sideDelt = toneOf("sideDelts");
  const rearDelt = toneOf("rearDelts");
  const biceps = toneOf("biceps");
  const triceps = toneOf("triceps");
  const forearms = toneOf("forearms");
  void highlight;

  return (
    <group ref={shoulderRef} position={[sign * spec.shoulderWidth, spec.shoulderHeight, 0]}>
      {/* deltoid cap */}
      <mesh castShadow material={materials.top} position={[sign * 0.012, 0.01, 0]}>
        <sphereGeometry args={[upperArm.r * 1.55, 18, 14]} />
      </mesh>
      {frontDelt && (
        <Zone material={frontDelt} position={[sign * 0.01, 0.015, upperArm.r * 1.15]} scale={[1, 1, 0.7]} r={upperArm.r * 0.95} />
      )}
      {sideDelt && (
        <Zone material={sideDelt} position={[sign * upperArm.r * 1.3, 0.03, 0]} scale={[0.8, 1, 1]} r={upperArm.r * 0.95} />
      )}
      {rearDelt && (
        <Zone material={rearDelt} position={[sign * 0.01, 0.015, -upperArm.r * 1.15]} scale={[1, 1, 0.7]} r={upperArm.r * 0.95} />
      )}
      <Capsule
        material={materials.skin}
        length={upperArm.len - upperArm.r}
        radius={upperArm.r}
        offsetY={-upperArm.len / 2}
      />
      {biceps && (
        <Zone material={biceps} position={[0, -upperArm.len * 0.5, upperArm.r * 0.68]} scale={[0.85, 2, 0.7]} r={upperArm.r * 0.9} />
      )}
      {triceps && (
        <Zone material={triceps} position={[0, -upperArm.len * 0.52, -upperArm.r * 0.68]} scale={[0.85, 2.1, 0.7]} r={upperArm.r * 0.9} />
      )}
      <group ref={elbowRef} position={[0, -upperArm.len, 0]}>
        <Capsule
          material={materials.skin}
          length={forearm.len - forearm.r}
          radius={forearm.r}
          offsetY={-forearm.len / 2}
        />
        {forearms && (
          <Zone material={forearms} position={[0, -forearm.len * 0.45, 0]} scale={[1.05, 2.4, 1.05]} r={forearm.r * 0.95} />
        )}
        <group ref={handRef} position={[0, -forearm.len - 0.03, 0]}>
          <mesh castShadow material={materials.skin}>
            <sphereGeometry args={[forearm.r * 1.25, 14, 12]} />
          </mesh>
          {held === "dumbbells" && <DumbbellProp scale={spec.scale} />}
        </group>
      </group>
    </group>
  );
}

function Leg({
  spec,
  materials,
  side,
  toneOf,
  hipRef,
  kneeRef,
  ankleRef,
}: {
  spec: BodySpec;
  materials: AthleteMaterials;
  side: "L" | "R";
  toneOf: (muscle: MuscleKey) => THREE.Material | null;
  hipRef: GroupRef;
  kneeRef: GroupRef;
  ankleRef: GroupRef;
}) {
  const sign = side === "L" ? -1 : 1;
  const { thigh, shin } = spec;
  const quads = toneOf("quads");
  const hamstrings = toneOf("hamstrings");
  const calves = toneOf("calves");
  const hipsTone = toneOf("hips");

  return (
    <group ref={hipRef} position={[sign * spec.hipWidth, -0.03, 0]}>
      <Capsule
        material={materials.bottoms}
        length={thigh.len - thigh.r}
        radius={thigh.r}
        offsetY={-thigh.len / 2}
      />
      {hipsTone && (
        <Zone material={hipsTone} position={[sign * thigh.r * 0.75, -0.05, 0]} scale={[0.8, 1.4, 1]} r={thigh.r * 0.95} />
      )}
      {quads && (
        <Zone material={quads} position={[0, -thigh.len * 0.48, thigh.r * 0.62]} scale={[0.95, 2.6, 0.75]} r={thigh.r * 0.9} />
      )}
      {hamstrings && (
        <Zone material={hamstrings} position={[0, -thigh.len * 0.5, -thigh.r * 0.62]} scale={[0.95, 2.6, 0.75]} r={thigh.r * 0.9} />
      )}
      <group ref={kneeRef} position={[0, -thigh.len, 0]}>
        <Capsule
          material={materials.skin}
          length={shin.len - shin.r}
          radius={shin.r}
          offsetY={-shin.len / 2}
        />
        {calves && (
          <Zone material={calves} position={[0, -shin.len * 0.38, -shin.r * 0.55]} scale={[0.95, 2.2, 0.8]} r={shin.r * 0.95} />
        )}
        <group ref={ankleRef} position={[0, -shin.len, 0]}>
          {/* shoe */}
          <mesh castShadow receiveShadow material={materials.shoes} position={[0, -0.035, 0.05]} scale={[1, 0.52, 1.85]}>
            <capsuleGeometry args={[0.055, 0.06, 6, 14]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* --------------------------------- athlete ---------------------------------- */

export interface SoraAthleteProps {
  gender: DemoAvatarGender;
  clip: ClipKey;
  held: HeldProp;
  playing: boolean;
  speed: number;
  playbackSpeed?: number;
  restartToken?: number;
  primaryMuscles?: MuscleKey[];
  secondaryMuscles?: MuscleKey[];
}

export function SoraAthlete({
  gender,
  clip,
  held,
  playing,
  speed,
  playbackSpeed = 1,
  restartToken = 0,
  primaryMuscles = [],
  secondaryMuscles = [],
}: SoraAthleteProps) {
  const spec = gender === "female" ? FEMALE : MALE;
  const materials = useAthleteMaterials(spec.female);
  const highlight = useHighlightMaterials();
  const toneOf = useMemo(() => {
    const primary = new Set(primaryMuscles);
    const secondary = new Set(secondaryMuscles);
    return (muscle: MuscleKey): THREE.Material | null =>
      primary.has(muscle) ? highlight.primary : secondary.has(muscle) ? highlight.secondary : null;
  }, [highlight, primaryMuscles, secondaryMuscles]);

  const root = useRef<THREE.Group>(null);
  const pelvis = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const shoulderL = useRef<THREE.Group>(null);
  const shoulderR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const handL = useRef<THREE.Group>(null);
  const handR = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const ankleL = useRef<THREE.Group>(null);
  const ankleR = useRef<THREE.Group>(null);
  const twoHandProp = useRef<THREE.Group>(null);

  const phaseRef = useRef(0);
  const poseRef = useRef<FlatPose>(emptyFlatPose());
  const vecL = useRef(new THREE.Vector3());
  const vecR = useRef(new THREE.Vector3());

  useEffect(() => {
    phaseRef.current = 0;
  }, [restartToken, clip]);

  useFrame((_, delta) => {
    const activeClip = CLIPS[clip] ?? CLIPS.idle;
    if (playing) {
      phaseRef.current = (phaseRef.current + (delta * speed * playbackSpeed) / activeClip.duration) % 1;
    }

    const pose = samplePose(activeClip, phaseRef.current, poseRef.current);

    // Pulse the muscle glow in sync with the rep.
    const effort = 0.5 - 0.5 * Math.cos(phaseRef.current * Math.PI * 2);
    highlight.primary.emissiveIntensity = 0.75 + effort * 0.85;
    highlight.primary.opacity = 0.72 + effort * 0.2;
    highlight.secondary.emissiveIntensity = 0.35 + effort * 0.4;
    highlight.secondary.opacity = 0.55 + effort * 0.18;

    if (root.current) {
      root.current.position.set(pose.rootX, spec.pelvisHeight * spec.scale + pose.rootY, pose.rootZ);
      root.current.rotation.set(pose.rootRX, pose.rootRY, pose.rootRZ);
    }
    pelvis.current?.rotation.set(pose["pelvis.x"], pose["pelvis.y"], pose["pelvis.z"]);
    torso.current?.rotation.set(pose["torso.x"], pose["torso.y"], pose["torso.z"]);
    chest.current?.rotation.set(pose["chest.x"], pose["chest.y"], pose["chest.z"]);
    head.current?.rotation.set(pose["head.x"], pose["head.y"], pose["head.z"]);
    shoulderL.current?.rotation.set(pose["shoulderL.x"], pose["shoulderL.y"], pose["shoulderL.z"]);
    shoulderR.current?.rotation.set(pose["shoulderR.x"], pose["shoulderR.y"], pose["shoulderR.z"]);
    elbowL.current?.rotation.set(pose.elbowL, 0, 0);
    elbowR.current?.rotation.set(pose.elbowR, 0, 0);
    hipL.current?.rotation.set(pose["hipL.x"], pose["hipL.y"], pose["hipL.z"]);
    hipR.current?.rotation.set(pose["hipR.x"], pose["hipR.y"], pose["hipR.z"]);
    kneeL.current?.rotation.set(pose.kneeL, 0, 0);
    kneeR.current?.rotation.set(pose.kneeR, 0, 0);
    ankleL.current?.rotation.set(pose.ankleL, 0, 0);
    ankleR.current?.rotation.set(pose.ankleR, 0, 0);

    // Auto-grounding: pin the lowest foot to the floor so leg flexion never
    // leaves the athlete floating or clipping through the ground.
    if (activeClip.planted && root.current && ankleL.current && ankleR.current) {
      ankleL.current.getWorldPosition(vecL.current);
      ankleR.current.getWorldPosition(vecR.current);
      const soleOffset = 0.075 * spec.scale;
      const lowest = Math.min(vecL.current.y, vecR.current.y) - soleOffset;
      root.current.position.y -= lowest;
    }

    // Two-handed props (barbell / kettlebell) follow the midpoint of the hands.
    if (twoHandProp.current && handL.current && handR.current) {
      handL.current.getWorldPosition(vecL.current);
      handR.current.getWorldPosition(vecR.current);
      const mid = vecL.current.clone().add(vecR.current).multiplyScalar(0.5);
      twoHandProp.current.position.copy(mid);
      if (held === "barbell" || held === "cableBar") {
        const along = vecR.current.clone().sub(vecL.current).normalize();
        twoHandProp.current.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), along);
      } else {
        twoHandProp.current.rotation.set(0, 0, 0);
      }
    }
  });

  const { chestR, waistR, pelvisR, headR } = spec;

  return (
    <>
      <group ref={root} scale={spec.scale}>
        <group ref={pelvis}>
          {/* pelvis / hips */}
          <mesh castShadow receiveShadow material={materials.bottoms} position={[0, -0.02, 0]} scale={[1.25, 0.82, 1]}>
            <sphereGeometry args={[pelvisR, 22, 16]} />
          </mesh>
          {toneOf("glutes") && (
            <Zone material={toneOf("glutes")!} position={[0, -0.03, -pelvisR * 0.72]} scale={[2.1, 1.35, 1]} r={pelvisR * 0.62} />
          )}

          <Leg spec={spec} materials={materials} side="L" toneOf={toneOf} hipRef={hipL} kneeRef={kneeL} ankleRef={ankleL} />
          <Leg spec={spec} materials={materials} side="R" toneOf={toneOf} hipRef={hipR} kneeRef={kneeR} ankleRef={ankleR} />

          <group ref={torso} position={[0, spec.torsoLift, 0]}>
            {/* waist */}
            <mesh castShadow receiveShadow material={materials.top} position={[0, 0.04, 0]} scale={[1.12, 1.15, 0.86]}>
              <sphereGeometry args={[waistR, 22, 16]} />
            </mesh>
            {toneOf("core") && (
              <Zone material={toneOf("core")!} position={[0, 0.05, waistR * 0.74]} scale={[1.5, 1.9, 0.7]} r={waistR * 0.6} />
            )}
            {toneOf("obliques") && (
              <>
                <Zone material={toneOf("obliques")!} position={[-waistR * 0.95, 0.05, waistR * 0.3]} scale={[0.7, 1.8, 0.9]} r={waistR * 0.5} />
                <Zone material={toneOf("obliques")!} position={[waistR * 0.95, 0.05, waistR * 0.3]} scale={[0.7, 1.8, 0.9]} r={waistR * 0.5} />
              </>
            )}
            {toneOf("lowerBack") && (
              <Zone material={toneOf("lowerBack")!} position={[0, 0.03, -waistR * 0.78]} scale={[1.5, 1.7, 0.65]} r={waistR * 0.58} />
            )}

            <group ref={chest} position={[0, spec.chestLift, 0]}>
              {/* ribcage / chest */}
              <mesh
                castShadow
                receiveShadow
                material={materials.top}
                position={[0, 0.04, 0]}
                scale={[spec.female ? 1.18 : 1.34, 1.22, spec.female ? 0.92 : 0.95]}
              >
                <sphereGeometry args={[chestR, 24, 18]} />
              </mesh>
              {spec.female && (
                <mesh castShadow material={materials.top} position={[0, 0.05, 0.075]} scale={[1.5, 0.85, 0.9]}>
                  <sphereGeometry args={[chestR * 0.62, 18, 14]} />
                </mesh>
              )}
              {toneOf("chest") && (
                <Zone material={toneOf("chest")!} position={[0, 0.05, chestR * 0.76]} scale={[1.9, 1.4, 0.7]} r={chestR * 0.55} />
              )}
              {toneOf("upperChest") && (
                <Zone material={toneOf("upperChest")!} position={[0, 0.12, chestR * 0.7]} scale={[1.8, 0.85, 0.65]} r={chestR * 0.5} />
              )}
              {toneOf("lats") && (
                <>
                  <Zone material={toneOf("lats")!} position={[-chestR * 0.72, -0.04, -chestR * 0.42]} scale={[0.9, 1.9, 0.85]} r={chestR * 0.52} />
                  <Zone material={toneOf("lats")!} position={[chestR * 0.72, -0.04, -chestR * 0.42]} scale={[0.9, 1.9, 0.85]} r={chestR * 0.52} />
                </>
              )}
              {toneOf("midBack") && (
                <Zone material={toneOf("midBack")!} position={[0, 0.04, -chestR * 0.8]} scale={[1.7, 1.5, 0.65]} r={chestR * 0.5} />
              )}
              {toneOf("traps") && (
                <Zone material={toneOf("traps")!} position={[0, 0.16, -chestR * 0.55]} scale={[2, 0.8, 0.75]} r={chestR * 0.48} />
              )}

              <Arm spec={spec} materials={materials} side="L" held={held} toneOf={toneOf} highlight={highlight} shoulderRef={shoulderL} elbowRef={elbowL} handRef={handL} />
              <Arm spec={spec} materials={materials} side="R" held={held} toneOf={toneOf} highlight={highlight} shoulderRef={shoulderR} elbowRef={elbowR} handRef={handR} />

              <group ref={head} position={[0, spec.neckLift, 0]}>
                {/* neck */}
                <mesh castShadow material={materials.skin} position={[0, -0.02, 0]}>
                  <cylinderGeometry args={[0.045, 0.052, 0.09, 14]} />
                </mesh>
                {/* head */}
                <mesh castShadow material={materials.skin} position={[0, headR * 0.82, 0.01]} scale={[0.92, 1.06, 0.98]}>
                  <sphereGeometry args={[headR, 26, 20]} />
                </mesh>
                {/* hair */}
                {spec.female ? (
                  <>
                    <mesh castShadow material={materials.hair} position={[0, headR * 1.02, -0.015]} scale={[0.95, 0.85, 1]}>
                      <sphereGeometry args={[headR * 1.02, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                    </mesh>
                    {/* ponytail */}
                    <mesh castShadow material={materials.hair} position={[0, headR * 0.6, -headR * 1.15]} rotation={[d2(24), 0, 0]}>
                      <capsuleGeometry args={[0.032, 0.17, 6, 12]} />
                    </mesh>
                  </>
                ) : (
                  <mesh castShadow material={materials.hair} position={[0, headR * 1.08, -0.012]} scale={[0.96, 0.72, 1]}>
                    <sphereGeometry args={[headR * 1.0, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                  </mesh>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>

      {(held === "barbell" || held === "kettlebell" || held === "cableBar") && (
        <group ref={twoHandProp}>
          {held === "barbell" ? (
            <BarbellProp scale={spec.scale} />
          ) : held === "cableBar" ? (
            <CableBarProp scale={spec.scale} />
          ) : (
            <KettlebellProp scale={spec.scale} />
          )}
        </group>
      )}
    </>
  );
}

function d2(deg: number) {
  return (deg * Math.PI) / 180;
}
