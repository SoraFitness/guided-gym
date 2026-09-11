import { angleAt, boundingBox, distance, offsetFromLine, type Point } from "./geometry";
import { harmonyMetric, harmonyReport, type HarmonyReport } from "./scoring";

/** The points a member taps on a side-on body photo, in order. */
export const BODY_SIDE_STEPS = [
  {
    id: "tragus",
    label: "Ear",
    instruction: "Tap the small flap at the front of your ear canal.",
  },
  {
    id: "c7",
    label: "Base of the neck",
    instruction: "Tap the bony bump at the base of the back of your neck.",
  },
  {
    id: "acromion",
    label: "Shoulder tip",
    instruction: "Tap the bony point at the very top of your shoulder.",
  },
  {
    id: "hip",
    label: "Side of the hip",
    instruction: "Tap the bony point on the side of your hip, just below your waistband.",
  },
  {
    id: "knee",
    label: "Side of the knee",
    instruction: "Tap the middle of the side of your knee joint.",
  },
  {
    id: "ankle",
    label: "Ankle bone",
    instruction: "Tap the bony bump on the outside of your ankle.",
  },
] as const;

export type BodySidePointId = (typeof BODY_SIDE_STEPS)[number]["id"];
export type BodySidePoints = Record<BodySidePointId, Point>;

const DEGREES = 180 / Math.PI;

export function measureBodySide(points: BodySidePoints): HarmonyReport {
  const p = points;
  const warnings: string[] = [];
  // Which way the member faces: the ear sits in front of the base of the neck.
  const facing = Math.sign(p.tragus.x - p.c7.x) || 1;
  if (
    p.tragus.y >= p.c7.y ||
    p.hip.y <= p.acromion.y ||
    p.knee.y <= p.hip.y ||
    p.ankle.y <= p.knee.y
  ) {
    warnings.push(
      "Some points look out of place. Tap Adjust points and check each one matches its label.",
    );
  }

  // Craniovertebral angle: a level line through C7 against the line from C7 to the ear.
  const craniovertebral = Math.atan2(p.c7.y - p.tragus.y, Math.abs(p.tragus.x - p.c7.x)) * DEGREES;
  // Forward shoulder angle: a vertical line down from C7 against the line from C7 to the acromion.
  const forwardShoulder =
    Math.atan2((p.acromion.x - p.c7.x) * facing, p.acromion.y - p.c7.y) * DEGREES;
  // Knee hyperextension: how far the knee sits behind the straight hip–ankle line.
  const kneeBend = 180 - angleAt(p.hip, p.knee, p.ankle);
  const kneeBehind =
    offsetFromLine(p.knee, p.hip, p.ankle, { x: p.knee.x + facing * 1000, y: p.knee.y }) < 0;

  const metrics = [
    harmonyMetric({
      id: "craniovertebral-angle",
      label: "Craniovertebral angle",
      value: craniovertebral,
      format: "degrees",
      ideal: { min: 53, max: Infinity },
      tolerance: 8,
      source:
        "Photogrammetry studies report normal head posture from above 53°, with forward head posture defined below cutoffs between 44° and 54° (“Evaluation of the Craniovertebral Angle in Standing versus Sitting Positions in Young Adults with and without Severe Forward Head Posture”).",
      explanation:
        "The angle between a level line through the base of your neck and the line up to your ear. The lower it is, the further forward your head sits.",
      overlay: {
        angles: [
          {
            vertex: p.c7,
            from: { x: p.c7.x + facing * distance(p.c7, p.tragus), y: p.c7.y },
            to: p.tragus,
          },
        ],
      },
    }),
    harmonyMetric({
      id: "forward-shoulder-angle",
      label: "Forward shoulder angle",
      value: forwardShoulder,
      format: "degrees",
      ideal: { min: -Infinity, max: 52 },
      tolerance: 8,
      source:
        "Rounded shoulder posture is defined as a forward shoulder angle of 52° or more (Thigpen et al., 2010).",
      explanation:
        "The angle between a vertical line down from the base of your neck and the line to the tip of your shoulder. The higher it is, the more rounded your shoulders.",
      overlay: {
        angles: [
          {
            vertex: p.c7,
            from: { x: p.c7.x, y: p.c7.y + distance(p.c7, p.acromion) },
            to: p.acromion,
          },
        ],
      },
    }),
    harmonyMetric({
      id: "knee-hyperextension",
      label: "Knee hyperextension",
      value: kneeBehind ? kneeBend : -kneeBend,
      format: "degrees",
      ideal: { min: -Infinity, max: 5 },
      tolerance: 5,
      source:
        "Knee hyperextension (genu recurvatum) is defined as the knee extending more than 5° past straight.",
      explanation:
        "How far your knee bends backward past straight, from hip to knee to ankle. A negative value means the knee is slightly bent rather than locked back.",
      overlay: {
        lines: [
          [p.hip, p.ankle],
          [p.hip, p.knee],
          [p.knee, p.ankle],
        ],
        points: [p.hip, p.knee, p.ankle],
      },
    }),
  ];

  return harmonyReport(metrics, warnings, boundingBox(Object.values(points), 0.15));
}
