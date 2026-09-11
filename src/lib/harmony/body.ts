import {
  angleAt,
  boundingBox,
  midpoint,
  offsetFromLine,
  ratio,
  tiltFromLevel,
  type Point,
} from "./geometry";
import { harmonyMetric, harmonyReport, type HarmonyMetric, type HarmonyReport } from "./scoring";

export interface PoseKeypoint extends Point {
  visibility: number;
}

/** Body landmarks in image pixels. Left and right follow the pose model's naming. */
export interface BodyPose {
  nose: PoseKeypoint;
  leftShoulder: PoseKeypoint;
  rightShoulder: PoseKeypoint;
  leftElbow: PoseKeypoint;
  rightElbow: PoseKeypoint;
  leftWrist: PoseKeypoint;
  rightWrist: PoseKeypoint;
  leftHip: PoseKeypoint;
  rightHip: PoseKeypoint;
  leftKnee: PoseKeypoint;
  rightKnee: PoseKeypoint;
  leftAnkle: PoseKeypoint;
  rightAnkle: PoseKeypoint;
  leftHeel: PoseKeypoint;
  rightHeel: PoseKeypoint;
}

/** Person-segmentation confidence (0–1) per pixel, row by row, at image size. */
export interface SilhouetteMask {
  width: number;
  height: number;
  data: Float32Array;
}

/** Front and back photos are measured the same way; only the wording changes. */
export type BodyView = "front" | "back";

interface Span {
  y: number;
  left: number;
  right: number;
}

const spanWidth = (span: Span) => span.right - span.left + 1;

// Only posture checks with a published normal range are scored. Photo outline
// widths have no agreed ideal (published shoulder, waist, and hip ideals use
// tape-measure circumferences), so they are measured and shown without a score.
const SOURCES = {
  shoulderHeight:
    "Shoulders are considered level when their heights differ by less than 1 cm (Kuklo et al.). Healthy adolescents averaged 7.5 mm (Akel et al.).",
  hipLevel:
    "Healthy adults show 0–5.6° of side-to-side pelvic tilt, median 2°, with no difference between men and women (“Slight pelvic obliquity is normal in a healthy population”).",
  kneeAlignment:
    "Leg alignment is classed as neutral within 3° of straight on the hip–knee–ankle angle, and as bow-legged (varus) or knock-kneed (valgus) beyond that.",
};

/** The run of body pixels on row `y` that contains (or sits next to) `centerX`. */
export function silhouetteSpan(mask: SilhouetteMask, y: number, centerX: number): Span | null {
  const row = Math.round(y);
  if (row < 0 || row >= mask.height) return null;
  const inside = (x: number) => mask.data[row * mask.width + x] >= 0.5;
  const start = Math.max(0, Math.min(mask.width - 1, Math.round(centerX)));
  const reach = Math.round(mask.width * 0.06);
  let seed = -1;
  for (let offset = 0; offset <= reach && seed < 0; offset += 1) {
    if (start - offset >= 0 && inside(start - offset)) seed = start - offset;
    else if (start + offset < mask.width && inside(start + offset)) seed = start + offset;
  }
  if (seed < 0) return null;
  let left = seed;
  while (left > 0 && inside(left - 1)) left -= 1;
  let right = seed;
  while (right < mask.width - 1 && inside(right + 1)) right += 1;
  return { y: row, left, right };
}

/** A horizontal reference line from the higher of two points across to the other. */
function levelLine(a: Point, b: Point): [Point, Point] {
  const [higher, lower] = a.y <= b.y ? [a, b] : [b, a];
  return [higher, { x: lower.x, y: higher.y }];
}

export function measureBodyHarmony(
  pose: BodyPose,
  mask: SilhouetteMask,
  options: { view: BodyView; heightCm: number | null },
): HarmonyReport {
  const { view, heightCm } = options;
  const warnings: string[] = [];
  const fullFrame = { x: 0, y: 0, width: mask.width, height: mask.height };
  const essential = [
    pose.leftShoulder,
    pose.rightShoulder,
    pose.leftHip,
    pose.rightHip,
    pose.leftKnee,
    pose.rightKnee,
    pose.leftAnkle,
    pose.rightAnkle,
  ];
  if (essential.some((point) => point.visibility < 0.5)) {
    warnings.push(
      "Part of your body isn't clearly visible. Use a head-to-toe photo with your whole body in frame.",
    );
  }

  const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
  const hipMid = midpoint(pose.leftHip, pose.rightHip);
  const torso = hipMid.y - shoulderMid.y;
  if (torso <= 0) {
    return harmonyReport(
      [],
      [
        `We couldn't find a standing body in this photo. Retake it head to toe, ${view === "front" ? "facing" : "with your back to"} the camera.`,
      ],
      fullFrame,
    );
  }

  const inBody = (x: number, y: number) => {
    const row = Math.round(y);
    const column = Math.round(x);
    return (
      row >= 0 &&
      row < mask.height &&
      column >= 0 &&
      column < mask.width &&
      mask.data[row * mask.width + column] >= 0.5
    );
  };
  const centerAt = (y: number) =>
    shoulderMid.x + (hipMid.x - shoulderMid.x) * ((y - shoulderMid.y) / torso);
  const spansBetween = (from: number, to: number) => {
    const step = Math.max(1, Math.round((to - from) / 40));
    const spans: Span[] = [];
    for (let y = from; y <= to; y += step) {
      const span = silhouetteSpan(mask, y, centerAt(y));
      if (span) spans.push(span);
    }
    return spans;
  };
  const widest = (spans: Span[]) =>
    spans.reduce<Span | null>(
      (best, span) => (!best || spanWidth(span) > spanWidth(best) ? span : best),
      null,
    );
  const narrowest = (spans: Span[]) =>
    spans.reduce<Span | null>(
      (best, span) => (!best || spanWidth(span) < spanWidth(best) ? span : best),
      null,
    );

  const shoulders = widest(
    spansBetween(shoulderMid.y - 0.05 * torso, shoulderMid.y + 0.15 * torso),
  );
  const waist = narrowest(spansBetween(shoulderMid.y + 0.45 * torso, hipMid.y - 0.05 * torso));
  const hips = widest(spansBetween(hipMid.y - 0.05 * torso, hipMid.y + 0.25 * torso));

  // Arms resting against the torso merge into its outline and inflate waist and hip widths.
  const armJoints = [pose.leftElbow, pose.rightElbow, pose.leftWrist, pose.rightWrist].filter(
    (joint) => joint.visibility >= 0.5,
  );
  const armTouches = (span: Span | null) =>
    Boolean(span) &&
    armJoints.some(
      (joint) =>
        Math.abs(joint.y - span!.y) < 0.2 * torso &&
        joint.x > span!.left - 0.01 * mask.width &&
        joint.x < span!.right + 0.01 * mask.width,
    );
  const waistMerged = armTouches(waist) || armTouches(hips);
  const hipsMerged = armTouches(hips);
  if (waistMerged) {
    warnings.push(
      "Your arms are touching your sides, so waist and hip widths can't be measured cleanly. Retake with your arms held slightly away from your body.",
    );
  }

  let headTop: number | null = null;
  for (let y = 0; y < pose.nose.y && headTop === null; y += 2) {
    if (silhouetteSpan(mask, y, pose.nose.x)) headTop = y;
  }
  const floor = Math.max(pose.leftHeel.y, pose.rightHeel.y, pose.leftAnkle.y, pose.rightAnkle.y);
  const feetVisible = [pose.leftHeel, pose.rightHeel, pose.leftAnkle, pose.rightAnkle].some(
    (point) => point.visibility >= 0.5,
  );
  const stature = headTop !== null && floor > headTop ? floor - headTop : null;

  // Crotch height: walk up the gap between the legs until the outline closes.
  const kneeMid = midpoint(pose.leftKnee, pose.rightKnee);
  const ankleMid = midpoint(pose.leftAnkle, pose.rightAnkle);
  const legCenterAt = (y: number) =>
    hipMid.x + (ankleMid.x - hipMid.x) * ((y - hipMid.y) / (ankleMid.y - hipMid.y || 1));
  let crotch: number | null = null;
  if (!inBody(ankleMid.x, ankleMid.y)) {
    for (let y = Math.round(ankleMid.y); y > hipMid.y; y -= 1) {
      if (inBody(legCenterAt(y), y)) {
        crotch = y;
        break;
      }
    }
  }
  // The crotch sits just below the hip joints. A gap that closes much lower is loose
  // shorts or touching legs, not the crotch, so leg length isn't measured.
  const crotchFound = crotch !== null && crotch <= hipMid.y + 0.35 * (kneeMid.y - hipMid.y);
  if (stature !== null && !crotchFound) {
    warnings.push(
      "Loose clothing or touching legs hide where your legs meet, so leg length can't be measured. Wear fitted shorts and stand with your feet about hip-width apart.",
    );
  }

  const line = (span: Span): [Point, Point] => [
    { x: span.left, y: span.y },
    { x: span.right, y: span.y },
  ];
  const side = view === "front" ? "front" : "back";
  const metrics: HarmonyMetric[] = [];

  if (shoulders && waist) {
    metrics.push(
      harmonyMetric({
        id: "shoulder-waist",
        label: "Shoulder-to-waist width",
        value: ratio(spanWidth(shoulders), spanWidth(waist)),
        format: "ratio",
        explanation:
          "Shoulder width compared with the narrowest point of your waist, measured from your outline. Track it over time to see your V-taper change.",
        overlay: { lines: [line(shoulders), line(waist)] },
        reliable: !waistMerged,
      }),
    );
  }
  if (waist && hips) {
    metrics.push(
      harmonyMetric({
        id: "waist-hip",
        label: "Waist-to-hip width",
        value: ratio(spanWidth(waist), spanWidth(hips)),
        format: "ratio",
        explanation: `Waist width compared with hip width from the ${side}. Published waist-to-hip ideals use tape-measure circumferences, not photo widths.`,
        overlay: { lines: [line(waist), line(hips)] },
        reliable: !waistMerged,
      }),
    );
  }
  if (shoulders && hips) {
    metrics.push(
      harmonyMetric({
        id: "shoulder-hip",
        label: "Shoulder-to-hip width",
        value: ratio(spanWidth(shoulders), spanWidth(hips)),
        format: "ratio",
        explanation: `Shoulder width compared with hip width from the ${side}.`,
        overlay: { lines: [line(shoulders), line(hips)] },
        reliable: !hipsMerged,
      }),
    );
  }
  if (stature !== null && headTop !== null) {
    const legCenter = legCenterAt(crotch ?? hipMid.y);
    metrics.push(
      harmonyMetric({
        id: "leg-body",
        label: "Leg-to-body ratio",
        value: crotchFound && crotch !== null ? ratio(floor - crotch, stature) : 0,
        format: "ratio",
        explanation:
          "Height from the floor to your crotch compared with your total height. Studies find legs slightly longer than average are rated most attractive, but there's no fixed ideal value.",
        overlay: {
          lines: [
            [
              { x: pose.nose.x, y: headTop },
              { x: pose.nose.x, y: floor },
            ],
            [
              { x: legCenter, y: crotch ?? hipMid.y },
              { x: legCenter, y: floor },
            ],
          ],
        },
        reliable: feetVisible && crotchFound,
      }),
    );
  }

  const cmPerPixel = stature !== null && heightCm ? heightCm / stature : null;
  metrics.push(
    harmonyMetric({
      id: "shoulder-height",
      label: "Shoulder height difference",
      value: cmPerPixel ? Math.abs(pose.leftShoulder.y - pose.rightShoulder.y) * cmPerPixel : 0,
      format: "cm",
      ideal: { min: -Infinity, max: 1 },
      tolerance: 1,
      source: SOURCES.shoulderHeight,
      explanation:
        "How much higher one shoulder sits than the other, converted to centimetres using the height in your profile.",
      overlay: {
        lines: [
          [pose.leftShoulder, pose.rightShoulder],
          levelLine(pose.leftShoulder, pose.rightShoulder),
        ],
        points: [pose.leftShoulder, pose.rightShoulder],
      },
      reliable: cmPerPixel !== null && feetVisible,
    }),
    harmonyMetric({
      id: "hip-level",
      label: "Hip level",
      value: tiltFromLevel(pose.leftHip, pose.rightHip),
      format: "degrees",
      ideal: { min: 0, max: 5.6 },
      tolerance: 3,
      source: SOURCES.hipLevel,
      explanation:
        "How far the line between your hip joints tilts from level. Standing with more weight on one leg is the most common cause in photos.",
      overlay: {
        lines: [[pose.leftHip, pose.rightHip], levelLine(pose.leftHip, pose.rightHip)],
        points: [pose.leftHip, pose.rightHip],
      },
    }),
  );

  const legAlignment = (hip: PoseKeypoint, knee: PoseKeypoint, ankle: PoseKeypoint) => ({
    bend: 180 - angleAt(hip, knee, ankle),
    towardMidline: offsetFromLine(knee, hip, ankle, { x: hipMid.x, y: knee.y }) > 0,
  });
  const legs = [
    legAlignment(pose.leftHip, pose.leftKnee, pose.leftAnkle),
    legAlignment(pose.rightHip, pose.rightKnee, pose.rightAnkle),
  ];
  const leastStraight = legs[0].bend >= legs[1].bend ? legs[0] : legs[1];
  const kneesVisible = [pose.leftKnee, pose.rightKnee, pose.leftAnkle, pose.rightAnkle].every(
    (point) => point.visibility >= 0.5,
  );
  const bendDescription =
    leastStraight.bend < 0.5
      ? "Both legs are straight."
      : `Your less straight leg angles ${leastStraight.towardMidline ? "inward at the knee (knock-kneed)" : "outward at the knee (bow-legged)"}.`;
  metrics.push(
    harmonyMetric({
      id: "knee-alignment",
      label: "Knee alignment",
      value: leastStraight.bend,
      format: "degrees",
      ideal: { min: 0, max: 3 },
      tolerance: 3,
      source: SOURCES.kneeAlignment,
      explanation: `How far your knee sits off the straight line from hip to ankle. ${bendDescription} The standard is measured on X-rays, so joint centres from a photo give an estimate.`,
      overlay: {
        lines: [
          [pose.leftHip, pose.leftKnee],
          [pose.leftKnee, pose.leftAnkle],
          [pose.rightHip, pose.rightKnee],
          [pose.rightKnee, pose.rightAnkle],
        ],
        points: [pose.leftKnee, pose.rightKnee],
      },
      reliable: kneesVisible,
    }),
  );

  const focusPoints: Point[] = [...essential, pose.nose, pose.leftHeel, pose.rightHeel];
  for (const span of [shoulders, waist, hips]) {
    if (span) focusPoints.push(...line(span));
  }
  if (headTop !== null) focusPoints.push({ x: pose.nose.x, y: headTop });

  return harmonyReport(metrics, warnings, boundingBox(focusPoints, 0.08));
}
