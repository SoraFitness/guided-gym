import {
  angleAt,
  boundingBox,
  distance,
  midpoint,
  ratio,
  riseAngle,
  rotatePoint,
  type Point,
} from "./geometry";
import {
  harmonyMetric,
  harmonyReport,
  idealFor,
  type HarmonyReport,
  type HarmonySex,
} from "./scoring";

// Ideal ranges are FaceIQ Labs' published ranges, which differ for men and women
// (faceiqlabs.com/celebs-wiki). Members who don't list male or female get the
// average of both. Where FaceIQ published example scores, each `tolerance` was
// fitted so our score matches theirs.

/** Named front-face landmarks in image pixels. "A" is the image-left side, "B" the image-right. */
export interface FrontFacePoints {
  eyeOuterA: Point;
  eyeInnerA: Point;
  eyeInnerB: Point;
  eyeOuterB: Point;
  pupilA: Point;
  pupilB: Point;
  browA: Point;
  browB: Point;
  nasion: Point;
  noseTip: Point;
  subnasale: Point;
  alarA: Point;
  alarB: Point;
  mouthA: Point;
  mouthB: Point;
  upperLipTop: Point;
  upperLipBottom: Point;
  lowerLipTop: Point;
  lowerLipBottom: Point;
  menton: Point;
  cheekA: Point;
  cheekB: Point;
  /** Jaw corners as seen from the front, on the jaw edge level with the mouth. */
  jawA: Point;
  jawB: Point;
}

type FrontFaceKey = keyof FrontFacePoints;

const SYMMETRY_PAIRS: Array<[FrontFaceKey, FrontFaceKey]> = [
  ["eyeOuterA", "eyeOuterB"],
  ["eyeInnerA", "eyeInnerB"],
  ["pupilA", "pupilB"],
  ["browA", "browB"],
  ["alarA", "alarB"],
  ["mouthA", "mouthB"],
  ["cheekA", "cheekB"],
  ["jawA", "jawB"],
];
const MIDLINE: FrontFaceKey[] = [
  "nasion",
  "noseTip",
  "subnasale",
  "upperLipTop",
  "lowerLipBottom",
  "menton",
];

const DEGREES = 180 / Math.PI;

export function faceIqSource(sex: HarmonySex) {
  const group = sex === "male" ? "men" : sex === "female" ? "women" : "men and women, averaged";
  return `FaceIQ Labs' published ideal range for ${group}. FaceIQ lists slightly different ranges for different faces; this range covers all of them.`;
}

function symmetryDeviation(points: FrontFacePoints, faceWidth: number) {
  const midX = MIDLINE.reduce((sum, key) => sum + points[key].x, 0) / MIDLINE.length;
  const deviations = SYMMETRY_PAIRS.map(
    ([a, b]) =>
      Math.abs((points[a].x + points[b].x) / 2 - midX) + Math.abs(points[a].y - points[b].y),
  );
  const average = deviations.reduce((sum, value) => sum + value, 0) / deviations.length;
  return ratio(average, faceWidth) * 100;
}

export function measureFrontHarmony(points: FrontFacePoints, sex: HarmonySex): HarmonyReport {
  const warnings: string[] = [];
  const range = (male: [number, number], female: [number, number]) =>
    idealFor(sex, {
      male: { min: male[0], max: male[1] },
      female: { min: female[0], max: female[1] },
    });
  const source = faceIqSource(sex);

  // Level the face on the pupil line so a tilted head doesn't skew angles or symmetry.
  const roll =
    Math.atan2(points.pupilB.y - points.pupilA.y, points.pupilB.x - points.pupilA.x) * DEGREES;
  const center = midpoint(points.pupilA, points.pupilB);
  const level = Object.fromEntries(
    Object.entries(points).map(([key, point]) => [key, rotatePoint(point, center, -roll)]),
  ) as unknown as FrontFacePoints;
  if (Math.abs(roll) > 8) {
    warnings.push(
      "Your head is tilted in this photo. Measurements were levelled, but a straight, upright photo is more accurate.",
    );
  }

  const cheekWidth = distance(level.cheekA, level.cheekB);
  const yaw = ratio(level.noseTip.x - midpoint(level.cheekA, level.cheekB).x, cheekWidth);
  if (Math.abs(yaw) > 0.06) {
    warnings.push(
      "Your face is turned slightly to one side. Face the camera directly for the most accurate harmony.",
    );
  }

  const height = (a: Point, b: Point) => Math.abs(b.y - a.y);
  const ipd = distance(level.pupilA, level.pupilB);
  const jfa = angleAt(level.jawA, level.menton, level.jawB);
  const iaa = angleAt(level.eyeOuterA, level.subnasale, level.eyeOuterB);
  const o = points;
  const jawAngle = { vertex: o.menton, from: o.jawA, to: o.jawB };
  const alarAngle = { vertex: o.subnasale, from: o.eyeOuterA, to: o.eyeOuterB };
  const browLine = midpoint(o.browA, o.browB);

  const metrics = [
    harmonyMetric({
      id: "canthal-tilt",
      label: "Lateral canthal tilt",
      value:
        (riseAngle(level.eyeInnerA, level.eyeOuterA) +
          riseAngle(level.eyeInnerB, level.eyeOuterB)) /
        2,
      format: "degrees",
      ideal: range([6, 7.7], [6.8, 10.2]),
      tolerance: 3.9,
      source,
      explanation:
        "The upward angle from the inner to the outer corner of each eye. A slight upward tilt reads as alert and youthful.",
      overlay: {
        lines: [
          [o.eyeInnerA, o.eyeOuterA],
          [o.eyeInnerB, o.eyeOuterB],
        ],
        points: [o.eyeInnerA, o.eyeOuterA, o.eyeInnerB, o.eyeOuterB],
      },
    }),
    harmonyMetric({
      id: "eye-separation",
      label: "Eye separation ratio",
      value: ratio(ipd, cheekWidth) * 100,
      format: "percent",
      ideal: range([45.7, 46.8], [46.3, 47.5]),
      tolerance: 2,
      source,
      explanation:
        "Distance between the pupils as a share of face width. Balanced spacing keeps the eyes neither close-set nor wide-set.",
      overlay: {
        lines: [
          [o.pupilA, o.pupilB],
          [o.cheekA, o.cheekB],
        ],
      },
    }),
    harmonyMetric({
      id: "fwhr",
      label: "Face width to height ratio",
      value: ratio(cheekWidth, height(level.nasion, level.upperLipTop)),
      format: "ratio",
      ideal: range([1.95, 2.05], [1.9, 2]),
      tolerance: 0.15,
      source,
      explanation:
        "Face width compared with the height from the bridge of the nose to the upper lip.",
      overlay: {
        lines: [
          [o.cheekA, o.cheekB],
          [o.nasion, o.upperLipTop],
        ],
      },
    }),
    harmonyMetric({
      id: "midface-ratio",
      label: "Midface ratio",
      value: ratio(ipd, height(midpoint(level.pupilA, level.pupilB), level.upperLipTop)),
      format: "ratio",
      ideal: range([0.98, 1.02], [1.04, 1.1]),
      tolerance: 0.25,
      source,
      explanation:
        "Pupil distance compared with the height from the eyes to the upper lip. A compact midface sits close to 1.0.",
      overlay: {
        lines: [
          [o.pupilA, o.pupilB],
          [midpoint(o.pupilA, o.pupilB), o.upperLipTop],
        ],
      },
    }),
    harmonyMetric({
      id: "ipsilateral-alar-angle",
      label: "Ipsilateral alar angle",
      value: iaa,
      format: "degrees",
      ideal: range([86.5, 92.5], [85.5, 93.5]),
      tolerance: 10,
      source,
      explanation:
        "The angle at the base of the nose formed by lines to the outer corner of each eye.",
      overlay: { angles: [alarAngle] },
    }),
    harmonyMetric({
      id: "jaw-frontal-angle",
      label: "Jaw frontal angle",
      value: jfa,
      format: "degrees",
      ideal: range([86.5, 92.5], [87.5, 93.5]),
      tolerance: 11.4,
      source,
      explanation:
        "The angle at the chin formed by lines to each side of the jaw. Lower values read as a more tapered lower face.",
      overlay: { angles: [jawAngle] },
    }),
    harmonyMetric({
      id: "iaa-jfa-deviation",
      label: "Deviation of IAA & JFA",
      value: Math.abs(iaa - jfa),
      format: "degrees",
      ideal: { min: 0, max: 2.5 },
      tolerance: 6.3,
      source,
      explanation:
        "How closely the ipsilateral alar angle matches the jaw frontal angle. When the two angles match, the eyes, nose, and jaw line up proportionately.",
      overlay: { angles: [alarAngle, jawAngle] },
    }),
    harmonyMetric({
      id: "bigonial-width",
      label: "Bigonial width",
      value: ratio(distance(level.jawA, level.jawB), cheekWidth) * 100,
      format: "percent",
      ideal: range([87.5, 91.5], [84, 88]),
      tolerance: 6.7,
      source,
      explanation: "Jaw width as a share of face width at eye level.",
      overlay: {
        lines: [
          [o.cheekA, o.cheekB],
          [o.jawA, o.jawB],
        ],
      },
    }),
    harmonyMetric({
      id: "mouth-nose-width",
      label: "Mouth width to nose width ratio",
      value: ratio(distance(level.mouthA, level.mouthB), distance(level.alarA, level.alarB)),
      format: "ratio",
      ideal: range([1.4, 1.5], [1.5, 1.6]),
      tolerance: 0.08,
      source,
      explanation: "Mouth width compared with nose width.",
      overlay: {
        lines: [
          [o.mouthA, o.mouthB],
          [o.alarA, o.alarB],
        ],
      },
    }),
    harmonyMetric({
      id: "facial-thirds",
      label: "Lower to middle third",
      // The middle third starts at the brow line, not the nose bridge.
      value: ratio(
        height(level.subnasale, level.menton),
        height(midpoint(level.browA, level.browB), level.subnasale),
      ),
      format: "ratio",
      // FaceIQ's lower-third range divided by its middle-third range (men 33.9–37.0% ÷
      // 31.4–33.4%, women 29.6–33.1% ÷ 32.4–34.9%). Their thirds use the hairline, which
      // a face mesh can't find, so we compare the two thirds directly.
      ideal: range([1.015, 1.178], [0.848, 1.022]),
      tolerance: 0.15,
      source: `Derived from FaceIQ Labs' published lower-third and middle-third ranges for ${
        sex === "male" ? "men" : sex === "female" ? "women" : "men and women, averaged"
      }.`,
      explanation:
        "Height from the base of the nose to the chin compared with the height from the brow line to the base of the nose.",
      overlay: {
        lines: [
          [browLine, o.subnasale],
          [o.subnasale, o.menton],
        ],
        points: [browLine, o.subnasale, o.menton],
      },
    }),
    harmonyMetric({
      id: "lip-ratio",
      label: "Lower lip to upper lip ratio",
      value: ratio(
        height(level.lowerLipTop, level.lowerLipBottom),
        height(level.upperLipTop, level.upperLipBottom),
      ),
      format: "ratio",
      ideal: { min: 1.6, max: 1.9 },
      tolerance: 0.7,
      source,
      explanation: "Lower lip height compared with upper lip height.",
      overlay: {
        lines: [
          [o.upperLipTop, o.upperLipBottom],
          [o.lowerLipTop, o.lowerLipBottom],
        ],
      },
    }),
    harmonyMetric({
      id: "chin-philtrum",
      label: "Chin to philtrum ratio",
      value: ratio(
        height(level.lowerLipBottom, level.menton),
        height(level.subnasale, level.upperLipTop),
      ),
      format: "ratio",
      ideal: range([2.1, 2.5], [2.1, 2.4]),
      tolerance: 0.4,
      source,
      explanation:
        "Chin height below the lower lip compared with the space between the nose and the upper lip.",
      overlay: {
        lines: [
          [o.subnasale, o.upperLipTop],
          [o.lowerLipBottom, o.menton],
        ],
      },
    }),
    harmonyMetric({
      id: "symmetry",
      label: "Facial symmetry",
      value: symmetryDeviation(level, cheekWidth),
      format: "percent",
      explanation:
        "Average left–right offset of matching features from the facial midline, as a share of face width. Lower is more symmetrical.",
      overlay: {
        lines: [
          [o.nasion, o.menton],
          [o.eyeOuterA, o.eyeOuterB],
          [o.mouthA, o.mouthB],
          [o.jawA, o.jawB],
        ],
      },
    }),
  ];

  return harmonyReport(metrics, warnings, boundingBox(Object.values(points), 0.22));
}
