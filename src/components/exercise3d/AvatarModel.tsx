import { useMemo } from "react";
import * as THREE from "three";

export type AvatarGender = "male" | "female" | "neutral";

export interface Pose {
  /** all values in radians */
  spine: number; // forward lean
  hipY: number; // vertical hip offset (m)
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  rootY: number; // whole-body vertical (m)
  rootRotX: number; // whole body pitch (for plank/pushup)
}

export const DEFAULT_POSE: Pose = {
  spine: 0,
  hipY: 0,
  leftHip: 0,
  rightHip: 0,
  leftKnee: 0,
  rightKnee: 0,
  leftShoulder: 0,
  rightShoulder: 0,
  leftElbow: 0.1,
  rightElbow: 0.1,
  rootY: 0,
  rootRotX: 0,
};

interface Props {
  gender: AvatarGender;
  pose: Pose;
}

function proportions(gender: AvatarGender) {
  if (gender === "female") {
    return {
      shoulderWidth: 0.42,
      hipWidth: 0.36,
      torsoLen: 0.62,
      armLen: 0.62,
      legLen: 0.92,
      headSize: 0.13,
      topColor: "#d65a8a", // sports bra
      bottomColor: "#222227",
      skin: "#e8b78d",
    };
  }
  if (gender === "male") {
    return {
      shoulderWidth: 0.54,
      hipWidth: 0.34,
      torsoLen: 0.66,
      armLen: 0.66,
      legLen: 0.96,
      headSize: 0.14,
      topColor: "#1a1a1f",
      bottomColor: "#0e0e12",
      skin: "#d9a07a",
    };
  }
  return {
    shoulderWidth: 0.48,
    hipWidth: 0.36,
    torsoLen: 0.64,
    armLen: 0.64,
    legLen: 0.94,
    headSize: 0.135,
    topColor: "#2a2a32",
    bottomColor: "#16161b",
    skin: "#dfa987",
  };
}

export function AvatarModel({ gender, pose }: Props) {
  const p = useMemo(() => proportions(gender), [gender]);
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.7 }), [p.skin]);
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ color: p.topColor, roughness: 0.55 }), [p.topColor]);
  const botMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: p.bottomColor, roughness: 0.6 }),
    [p.bottomColor],
  );

  const upperArm = p.armLen * 0.5;
  const foreArm = p.armLen * 0.5;
  const thigh = p.legLen * 0.52;
  const shin = p.legLen * 0.48;
  const hipBaseY = thigh + shin; // pelvis height when standing
  const shoulderY = hipBaseY + p.torsoLen;

  return (
    <group position={[0, pose.rootY, 0]} rotation={[pose.rootRotX, 0, 0]}>
      {/* legs (rooted at pelvis) */}
      <group position={[0, hipBaseY + pose.hipY, 0]}>
        {/* left leg */}
        <group position={[-p.hipWidth / 2, 0, 0]} rotation={[pose.leftHip, 0, 0]}>
          <mesh position={[0, -thigh / 2, 0]} material={botMat} castShadow>
            <capsuleGeometry args={[0.085, thigh * 0.7, 6, 12]} />
          </mesh>
          <group position={[0, -thigh, 0]} rotation={[pose.leftKnee, 0, 0]}>
            <mesh position={[0, -shin / 2, 0]} material={skinMat} castShadow>
              <capsuleGeometry args={[0.07, shin * 0.7, 6, 12]} />
            </mesh>
            <mesh position={[0, -shin - 0.04, 0.05]} material={botMat} castShadow>
              <boxGeometry args={[0.1, 0.07, 0.2]} />
            </mesh>
          </group>
        </group>
        {/* right leg */}
        <group position={[p.hipWidth / 2, 0, 0]} rotation={[pose.rightHip, 0, 0]}>
          <mesh position={[0, -thigh / 2, 0]} material={botMat} castShadow>
            <capsuleGeometry args={[0.085, thigh * 0.7, 6, 12]} />
          </mesh>
          <group position={[0, -thigh, 0]} rotation={[pose.rightKnee, 0, 0]}>
            <mesh position={[0, -shin / 2, 0]} material={skinMat} castShadow>
              <capsuleGeometry args={[0.07, shin * 0.7, 6, 12]} />
            </mesh>
            <mesh position={[0, -shin - 0.04, 0.05]} material={botMat} castShadow>
              <boxGeometry args={[0.1, 0.07, 0.2]} />
            </mesh>
          </group>
        </group>

        {/* torso pivots from hips (forward lean) */}
        <group rotation={[pose.spine, 0, 0]}>
          {/* hips block */}
          <mesh position={[0, 0.04, 0]} material={botMat} castShadow>
            <boxGeometry args={[p.hipWidth + 0.12, 0.18, 0.22]} />
          </mesh>
          {/* torso */}
          <mesh position={[0, p.torsoLen / 2 + 0.05, 0]} material={topMat} castShadow>
            <capsuleGeometry args={[p.shoulderWidth / 2, p.torsoLen * 0.55, 6, 12]} />
          </mesh>
          {/* neck */}
          <mesh position={[0, p.torsoLen + 0.05, 0]} material={skinMat} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
          </mesh>
          {/* head */}
          <mesh position={[0, p.torsoLen + 0.05 + 0.08 + p.headSize, 0]} material={skinMat} castShadow>
            <sphereGeometry args={[p.headSize, 20, 20]} />
          </mesh>

          {/* arms at shoulder line */}
          <group position={[-p.shoulderWidth / 2 - 0.04, p.torsoLen + 0.02, 0]} rotation={[pose.leftShoulder, 0, 0.15]}>
            <mesh position={[0, -upperArm / 2, 0]} material={skinMat} castShadow>
              <capsuleGeometry args={[0.06, upperArm * 0.7, 6, 12]} />
            </mesh>
            <group position={[0, -upperArm, 0]} rotation={[pose.leftElbow, 0, 0]}>
              <mesh position={[0, -foreArm / 2, 0]} material={skinMat} castShadow>
                <capsuleGeometry args={[0.055, foreArm * 0.7, 6, 12]} />
              </mesh>
              <mesh position={[0, -foreArm - 0.04, 0]} material={skinMat} castShadow>
                <sphereGeometry args={[0.06, 12, 12]} />
              </mesh>
            </group>
          </group>
          <group position={[p.shoulderWidth / 2 + 0.04, p.torsoLen + 0.02, 0]} rotation={[pose.rightShoulder, 0, -0.15]}>
            <mesh position={[0, -upperArm / 2, 0]} material={skinMat} castShadow>
              <capsuleGeometry args={[0.06, upperArm * 0.7, 6, 12]} />
            </mesh>
            <group position={[0, -upperArm, 0]} rotation={[pose.rightElbow, 0, 0]}>
              <mesh position={[0, -foreArm / 2, 0]} material={skinMat} castShadow>
                <capsuleGeometry args={[0.055, foreArm * 0.7, 6, 12]} />
              </mesh>
              <mesh position={[0, -foreArm - 0.04, 0]} material={skinMat} castShadow>
                <sphereGeometry args={[0.06, 12, 12]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* shadow-receiving floor handled by Canvas; ground reference */}
      <mesh position={[0, shoulderY * 0, 0]} visible={false}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
      </mesh>
    </group>
  );
}
