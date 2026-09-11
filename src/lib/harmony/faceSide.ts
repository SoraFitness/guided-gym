import { faceIqSource } from "./faceFront";
import {
  angleAt,
  boundingBox,
  direction,
  distance,
  dot,
  midpoint,
  offsetFromLine,
  type Point,
} from "./geometry";
import {
  harmonyMetric,
  harmonyReport,
  idealFor,
  type HarmonyReport,
  type HarmonySex,
} from "./scoring";

// Ideal ranges are FaceIQ Labs' published side-profile ranges, which differ for men
// and women. Line positions are positive when the lip or chin sits behind the line.
// Where FaceIQ published example scores, each `tolerance` was fitted to match them.

/** The points a member taps on a side-profile photo, in order. */
export const SIDE_PROFILE_STEPS = [
  {
    id: "glabella",
    label: "Brow bone",
    instruction: "Tap the most forward point of your forehead, between the brows.",
  },
  {
    id: "nasion",
    label: "Bridge of the nose",
    instruction: "Tap the deepest point where your forehead meets your nose.",
  },
  {
    id: "orbitale",
    label: "Under the eye",
    instruction: "Tap the lowest point of your lower eyelid.",
  },
  {
    id: "tragus",
    label: "Ear opening",
    instruction: "Tap the top of the small flap in front of your ear canal.",
  },
  { id: "noseTip", label: "Nose tip", instruction: "Tap the most forward point of your nose." },
  {
    id: "columella",
    label: "Underside of the nose",
    instruction: "Tap the middle of the underside of your nose, halfway between the tip and lip.",
  },
  {
    id: "subnasale",
    label: "Base of the nose",
    instruction: "Tap where the bottom of your nose meets your upper lip.",
  },
  {
    id: "alarCrease",
    label: "Back of the nostril",
    instruction: "Tap where the back of your nostril wing meets your cheek.",
  },
  {
    id: "upperLip",
    label: "Upper lip",
    instruction: "Tap the most forward point of your upper lip.",
  },
  {
    id: "lowerLip",
    label: "Lower lip",
    instruction: "Tap the most forward point of your lower lip.",
  },
  { id: "chin", label: "Chin", instruction: "Tap the most forward point of your chin." },
  { id: "menton", label: "Under the chin", instruction: "Tap the lowest point of your chin." },
  {
    id: "throat",
    label: "Throat",
    instruction: "Tap where the underside of your chin meets your neck.",
  },
  {
    id: "neck",
    label: "Front of the neck",
    instruction: "Tap a point lower down the front of your neck.",
  },
] as const;

export type SideProfilePointId = (typeof SIDE_PROFILE_STEPS)[number]["id"];
export type SideProfilePoints = Record<SideProfilePointId, Point>;

// Average soft-tissue nasion-to-gnathion height of North American young adults
// (Farkas). Photos carry no real scale, so millimetre values scale the tapped
// profile to this height.
const FACE_HEIGHT_MM: Record<HarmonySex, number> = { male: 121.3, female: 111.8, neutral: 116.6 };

const MM_NOTE = "Millimetres are estimated by scaling your profile to an average face height.";

export function measureSideHarmony(points: SideProfilePoints, sex: HarmonySex): HarmonyReport {
  const p = points;
  const warnings: string[] = [];
  const range = (male: [number, number], female: [number, number]) =>
    idealFor(sex, {
      male: { min: male[0], max: male[1] },
      female: { min: female[0], max: female[1] },
    });
  const source = faceIqSource(sex);
  const gnathion = midpoint(p.chin, p.menton);
  const pxPerMm = distance(p.nasion, gnathion) / FACE_HEIGHT_MM[sex] || 1;

  // The way the face looks: from the ear toward the nose.
  const facing = direction(p.tragus, p.noseTip);
  if (dot({ x: p.noseTip.x - p.nasion.x, y: p.noseTip.y - p.nasion.y }, facing) <= 0) {
    warnings.push(
      "Some points look out of place. Tap Adjust points and check each one matches its label.",
    );
  }

  /** Millimetres `point` sits behind the line through `a` and `b`; negative when in front of it. */
  const mmBehind = (point: Point, a: Point, b: Point) => {
    const mid = midpoint(a, b);
    const ahead = { x: mid.x + facing.x * 1000, y: mid.y + facing.y * 1000 };
    return -offsetFromLine(point, a, b, ahead) / pxPerMm;
  };

  // Chin recession: how far the chin sits behind a line through the nose bridge
  // that is perpendicular to the Frankfort plane (ear opening to under the eye).
  const frankfort = direction(p.tragus, p.orbitale);
  const perpendicular =
    frankfort.x >= 0 ? { x: -frankfort.y, y: frankfort.x } : { x: frankfort.y, y: -frankfort.x };
  const meridianLength = dot({ x: p.chin.x - p.nasion.x, y: p.chin.y - p.nasion.y }, perpendicular);
  const meridianAtChin = {
    x: p.nasion.x + perpendicular.x * meridianLength,
    y: p.nasion.y + perpendicular.y * meridianLength,
  };
  const chinRecession =
    dot({ x: p.nasion.x - p.chin.x, y: p.nasion.y - p.chin.y }, frankfort) / pxPerMm;

  const metrics = [
    harmonyMetric({
      id: "nasofrontal-angle",
      label: "Nasofrontal angle",
      value: angleAt(p.glabella, p.nasion, p.noseTip),
      format: "degrees",
      ideal: range([116, 130], [139, 155.2]),
      tolerance: 11,
      source,
      explanation:
        "The angle where the forehead meets the bridge of the nose. It shapes how smoothly the brow flows into the nose.",
      overlay: { angles: [{ vertex: p.nasion, from: p.glabella, to: p.noseTip }] },
    }),
    harmonyMetric({
      id: "nasolabial-angle",
      label: "Nasolabial angle",
      value: angleAt(p.columella, p.subnasale, p.upperLip),
      format: "degrees",
      ideal: range([97, 114], [96, 118]),
      tolerance: 10,
      source,
      explanation: "The angle between the underside of the nose and the upper lip.",
      overlay: { angles: [{ vertex: p.subnasale, from: p.columella, to: p.upperLip }] },
    }),
    harmonyMetric({
      id: "facial-convexity",
      label: "Facial convexity (glabella)",
      value: angleAt(p.glabella, p.subnasale, p.chin),
      format: "degrees",
      ideal: range([170, 175], [168, 174]),
      tolerance: 5,
      source,
      explanation:
        "The angle from the brow to the base of the nose to the chin. A straighter profile reads as more balanced.",
      overlay: { angles: [{ vertex: p.subnasale, from: p.glabella, to: p.chin }] },
    }),
    harmonyMetric({
      id: "nasal-projection",
      label: "Nasal projection",
      value: distance(p.alarCrease, p.noseTip) / (distance(p.nasion, p.noseTip) || 1),
      format: "ratio",
      ideal: range([0.6, 0.7], [0.5, 0.6]),
      tolerance: 0.1,
      source,
      explanation:
        "How far the nose tip projects from the back of the nostril, compared with the nose's length from the bridge to the tip.",
      overlay: {
        lines: [
          [p.alarCrease, p.noseTip],
          [p.nasion, p.noseTip],
        ],
        points: [p.alarCrease, p.noseTip, p.nasion],
      },
    }),
    harmonyMetric({
      id: "holdaway-h-line",
      label: "Holdaway H line",
      value: mmBehind(p.lowerLip, p.chin, p.upperLip),
      format: "mm",
      ideal: range([-0.2, 1.2], [-1.5, 0.9]),
      tolerance: 1.5,
      source,
      explanation: `How far the lower lip sits behind the line from the chin to the upper lip. Negative means in front of it. ${MM_NOTE}`,
      overlay: { lines: [[p.chin, p.upperLip]], points: [p.lowerLip] },
    }),
    harmonyMetric({
      id: "lower-lip-s-line",
      label: "Lower lip S-line position",
      value: mmBehind(p.lowerLip, p.chin, p.columella),
      format: "mm",
      ideal: range([-0.4, 1.4], [-2.1, 0.7]),
      tolerance: 1.5,
      source,
      explanation: `How far the lower lip sits behind the line from the chin to the middle of the nose's underside. Negative means in front of it. ${MM_NOTE}`,
      overlay: { lines: [[p.chin, p.columella]], points: [p.lowerLip] },
    }),
    harmonyMetric({
      id: "upper-lip-e-line",
      label: "Upper lip E-line position",
      value: mmBehind(p.upperLip, p.noseTip, p.chin),
      format: "mm",
      ideal: range([0.2, 5.8], [-0.5, 5.1]),
      tolerance: 2,
      source,
      explanation: `How far the upper lip sits behind the line from the nose tip to the chin. Negative means in front of it. ${MM_NOTE}`,
      overlay: { lines: [[p.noseTip, p.chin]], points: [p.upperLip] },
    }),
    harmonyMetric({
      id: "lower-lip-e-line",
      label: "Lower lip E-line position",
      value: mmBehind(p.lowerLip, p.noseTip, p.chin),
      format: "mm",
      ideal: range([0.1, 4.4], [-0.6, 3.7]),
      tolerance: 2,
      source,
      explanation: `How far the lower lip sits behind the line from the nose tip to the chin. Negative means in front of it. ${MM_NOTE}`,
      overlay: { lines: [[p.noseTip, p.chin]], points: [p.lowerLip] },
    }),
    harmonyMetric({
      id: "chin-recession",
      label: "Recession relative to Frankfort plane",
      value: chinRecession,
      format: "mm",
      ideal: { min: 1.5, max: 15 },
      tolerance: 7.5,
      source,
      explanation: `How far the chin sits behind a line dropped from the bridge of the nose at right angles to the Frankfort plane, which runs from the ear opening to under the eye. ${MM_NOTE}`,
      overlay: {
        lines: [
          [p.tragus, p.orbitale],
          [p.nasion, meridianAtChin],
          [meridianAtChin, p.chin],
        ],
        points: [p.tragus, p.orbitale, p.nasion, p.chin],
      },
    }),
    harmonyMetric({
      id: "submental-cervical-angle",
      label: "Submental cervical angle",
      value: angleAt(p.menton, p.throat, p.neck),
      format: "degrees",
      ideal: { min: 94, max: 106 },
      tolerance: 17,
      source,
      explanation:
        "The angle between the underside of the chin and the front of the neck. A sharper angle gives a more defined jaw and neck line.",
      overlay: { angles: [{ vertex: p.throat, from: p.menton, to: p.neck }] },
    }),
  ];

  return harmonyReport(metrics, warnings, boundingBox(Object.values(points), 0.15));
}
