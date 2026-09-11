import type {
  FaceLandmarker,
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import type { BodyPose, PoseKeypoint, SilhouetteMask } from "./body";
import type { FrontFacePoints } from "./faceFront";
import type { Point } from "./geometry";

// Landmark detection runs on the member's device with MediaPipe. The runtime and
// models download from their CDNs only when harmony is opened.
const VISION_VERSION = "1.0.1"; // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

export interface ImageFrame {
  width: number;
  height: number;
}

type Delegate = "GPU" | "CPU";

const loadVision = () => import("@mediapipe/tasks-vision");

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

let filesetPromise: Promise<WasmFileset> | null = null;
let facePromise: Promise<FaceLandmarker> | null = null;
let posePromise: Promise<PoseLandmarker> | null = null;

function getFileset() {
  filesetPromise ??= loadVision().then(({ FilesetResolver }) =>
    FilesetResolver.forVisionTasks(WASM_URL),
  );
  return filesetPromise;
}

async function withDelegateFallback<T>(create: (delegate: Delegate) => Promise<T>) {
  try {
    return await create("GPU");
  } catch {
    // Some WebViews can't create a GPU context; the CPU delegate is slower but works.
    return create("CPU");
  }
}

function resetOnFailure<T>(promise: Promise<T>, reset: () => void) {
  promise.catch(() => {
    reset();
    filesetPromise = null;
  });
  return promise;
}

function getFaceLandmarker() {
  facePromise ??= resetOnFailure(
    Promise.all([loadVision(), getFileset()]).then(([{ FaceLandmarker }, fileset]) =>
      withDelegateFallback((delegate) =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
          runningMode: "IMAGE",
          numFaces: 1,
        }),
      ),
    ),
    () => (facePromise = null),
  );
  return facePromise;
}

function getPoseLandmarker() {
  posePromise ??= resetOnFailure(
    Promise.all([loadVision(), getFileset()]).then(([{ PoseLandmarker }, fileset]) =>
      withDelegateFallback((delegate) =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
          runningMode: "IMAGE",
          numPoses: 1,
          outputSegmentationMasks: true,
        }),
      ),
    ),
    () => (posePromise = null),
  );
  return posePromise;
}

/** Loads a photo (data URL or signed URL) as a same-origin image the detectors can read. */
export async function loadHarmonyImage(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("Could not load the scan photo.");
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode the scan photo."));
      element.src = objectUrl;
    });
    return { image, release: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

// MediaPipe Face Mesh indices, checked on zoomed crops of a sample photo: 48/278 sit on the
// outer edge of the nostril wings, and 58/288 on the jaw edge level with the mouth, where
// FaceIQ-style jaw frontal angle and bigonial width lines end. A is image-left, B image-right.
const FACE_INDEX: Record<keyof FrontFacePoints, number> = {
  eyeOuterA: 33,
  eyeInnerA: 133,
  eyeInnerB: 362,
  eyeOuterB: 263,
  pupilA: 468,
  pupilB: 473,
  browA: 105,
  browB: 334,
  nasion: 168,
  noseTip: 1,
  subnasale: 2,
  alarA: 48,
  alarB: 278,
  mouthA: 61,
  mouthB: 291,
  upperLipTop: 0,
  upperLipBottom: 13,
  lowerLipTop: 14,
  lowerLipBottom: 17,
  menton: 152,
  cheekA: 234,
  cheekB: 454,
  jawA: 58,
  jawB: 288,
};

const FACE_PAIRS: Array<[keyof FrontFacePoints, keyof FrontFacePoints]> = [
  ["eyeOuterA", "eyeOuterB"],
  ["eyeInnerA", "eyeInnerB"],
  ["pupilA", "pupilB"],
  ["browA", "browB"],
  ["alarA", "alarB"],
  ["mouthA", "mouthB"],
  ["cheekA", "cheekB"],
  ["jawA", "jawB"],
];

export async function detectFrontFace(image: HTMLImageElement): Promise<FrontFacePoints | null> {
  const landmarker = await getFaceLandmarker();
  const landmarks = landmarker.detect(image).faceLandmarks[0];
  if (!landmarks) return null;
  const toPixels = (landmark: NormalizedLandmark): Point => ({
    x: landmark.x * image.naturalWidth,
    y: landmark.y * image.naturalHeight,
  });
  const points = Object.fromEntries(
    Object.entries(FACE_INDEX).map(([key, index]) => [key, toPixels(landmarks[index])]),
  ) as unknown as FrontFacePoints;
  // Keep side A on the image-left even for mirrored selfies.
  if (points.pupilA.x > points.pupilB.x) {
    for (const [a, b] of FACE_PAIRS) [points[a], points[b]] = [points[b], points[a]];
  }
  return points;
}

const POSE_INDEX: Record<keyof BodyPose, number> = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
};

export async function detectBody(
  image: HTMLImageElement,
): Promise<{ pose: BodyPose; mask: SilhouetteMask; frame: ImageFrame } | null> {
  const landmarker = await getPoseLandmarker();
  const result = landmarker.detect(image);
  try {
    const landmarks = result.landmarks[0];
    const segmentation = result.segmentationMasks?.[0];
    if (!landmarks || !segmentation) return null;
    // Measure in mask pixels; the mask covers the whole photo.
    const frame = { width: segmentation.width, height: segmentation.height };
    const pose = Object.fromEntries(
      Object.entries(POSE_INDEX).map(([key, index]) => {
        const landmark = landmarks[index];
        const keypoint: PoseKeypoint = {
          x: landmark.x * frame.width,
          y: landmark.y * frame.height,
          visibility: landmark.visibility ?? 0,
        };
        return [key, keypoint];
      }),
    ) as unknown as BodyPose;
    return { pose, frame, mask: { ...frame, data: segmentation.getAsFloat32Array().slice() } };
  } finally {
    result.close();
  }
}
