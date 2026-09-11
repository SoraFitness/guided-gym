import { describe, expect, it } from "vitest";
import { measureBodyHarmony, type BodyPose, type SilhouetteMask } from "./body";
import { measureBodySide, type BodySidePoints } from "./bodySide";
import { measureFrontHarmony, type FrontFacePoints } from "./faceFront";
import { measureSideHarmony, type SideProfilePoints } from "./faceSide";
import {
  angleAt,
  direction,
  distance,
  dot,
  midpoint,
  offsetFromLine,
  riseAngle,
  rotatePoint,
  type Point,
} from "./geometry";
import {
  harmonyMetric,
  harmonyReport,
  harmonyScore,
  idealFor,
  type HarmonyReport,
} from "./scoring";

const metric = (report: HarmonyReport, id: string) => {
  const found = report.metrics.find((item) => item.id === id);
  if (!found) throw new Error(`Missing metric ${id}`);
  return found;
};
const value = (report: HarmonyReport, id: string) => metric(report, id).value;

describe("harmony geometry and scoring", () => {
  it("measures angles, tilts, and which side of a line a point is on", () => {
    expect(angleAt({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
    expect(riseAngle({ x: 0, y: 10 }, { x: 10, y: 0 })).toBeCloseTo(45);
    expect(riseAngle({ x: 10, y: 10 }, { x: 0, y: 0 })).toBeCloseTo(45);
    expect(
      offsetFromLine({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 20, y: 5 }),
    ).toBeCloseTo(5);
    expect(
      offsetFromLine({ x: -5, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 20, y: 5 }),
    ).toBeCloseTo(-5);
  });

  it("scores 10 inside the ideal range and eases off outside it", () => {
    const ideal = { min: 4, max: 8 };
    expect(harmonyScore(6, ideal, 6)).toBe(10);
    expect(harmonyScore(9, ideal, 6)).toBe(9.7);
    expect(harmonyScore(14, ideal, 6)).toBe(5);
    expect(harmonyScore(-2, ideal, 6)).toBe(5);
    expect(harmonyScore(40, ideal, 6)).toBe(0);
    expect(
      idealFor("neutral", { male: { min: 84, max: 94 }, female: { min: 90, max: 100 } }),
    ).toEqual({ min: 87, max: 97 });
  });

  it("matches FaceIQ's published example scores", () => {
    // Submental cervical angle 110.8° on 94–106° scores 9.2; IAA & JFA deviation 8.4° on 0–2.5° scores 5.4.
    expect(harmonyScore(110.8, { min: 94, max: 106 }, 17)).toBe(9.2);
    expect(harmonyScore(8.4, { min: 0, max: 2.5 }, 6.3)).toBe(5.4);
  });

  it("supports open-ended ranges and measurements with no agreed ideal", () => {
    const overlay = {};
    const atLeast = harmonyMetric({
      id: "cva",
      label: "CVA",
      value: 60,
      format: "degrees",
      ideal: { min: 53, max: Infinity },
      tolerance: 8,
      source: "Study",
      explanation: "",
      overlay,
    });
    const under = harmonyMetric({
      id: "fsa",
      label: "FSA",
      value: 60,
      format: "degrees",
      ideal: { min: -Infinity, max: 52 },
      tolerance: 8,
      explanation: "",
      overlay,
    });
    const unscored = harmonyMetric({
      id: "width",
      label: "Width",
      value: 1.4,
      format: "ratio",
      source: "ignored without an ideal",
      explanation: "",
      overlay,
    });

    expect(atLeast.ideal).toBe("53.0° or more");
    expect(atLeast.score).toBe(10);
    expect(under.ideal).toBe("under 52.0°");
    expect(under.score).toBe(5);
    expect(unscored.ideal).toBeNull();
    expect(unscored.score).toBeNull();
    expect(unscored.source).toBeNull();
    const box = { x: 0, y: 0, width: 1, height: 1 };
    expect(harmonyReport([atLeast, under, unscored], [], box).score).toBe(7.5);
  });
});

// A symmetrical, upright synthetic face centred on x = 500.
const face: FrontFacePoints = {
  eyeOuterA: { x: 380, y: 405 },
  eyeInnerA: { x: 455, y: 410 },
  eyeInnerB: { x: 545, y: 410 },
  eyeOuterB: { x: 620, y: 405 },
  pupilA: { x: 418, y: 408 },
  pupilB: { x: 582, y: 408 },
  browA: { x: 410, y: 360 },
  browB: { x: 590, y: 360 },
  nasion: { x: 500, y: 405 },
  noseTip: { x: 500, y: 520 },
  subnasale: { x: 500, y: 545 },
  alarA: { x: 470, y: 535 },
  alarB: { x: 530, y: 535 },
  mouthA: { x: 452, y: 590 },
  mouthB: { x: 548, y: 590 },
  upperLipTop: { x: 500, y: 572 },
  upperLipBottom: { x: 500, y: 588 },
  lowerLipTop: { x: 500, y: 592 },
  lowerLipBottom: { x: 500, y: 618 },
  menton: { x: 500, y: 690 },
  cheekA: { x: 330, y: 470 },
  cheekB: { x: 670, y: 470 },
  jawA: { x: 355, y: 590 },
  jawB: { x: 645, y: 590 },
};

describe("front face harmony", () => {
  it("measures a symmetrical face as symmetrical", () => {
    const report = measureFrontHarmony(face, "neutral");
    expect(value(report, "symmetry")).toBeCloseTo(0);
    // No published ideal exists for photo symmetry, so it is shown but not scored.
    expect(metric(report, "symmetry").score).toBeNull();
    expect(value(report, "canthal-tilt")).toBeCloseTo(riseAngle(face.eyeInnerA, face.eyeOuterA));
    expect(value(report, "mouth-nose-width")).toBeCloseTo(96 / 60);
    expect(value(report, "bigonial-width")).toBeCloseTo((290 / 340) * 100);
    // The jaw frontal angle sits at the chin, like the alar angle sits at the base of the nose.
    const jfa = angleAt(face.jawA, face.menton, face.jawB);
    const iaa = angleAt(face.eyeOuterA, face.subnasale, face.eyeOuterB);
    expect(value(report, "jaw-frontal-angle")).toBeCloseTo(jfa);
    expect(value(report, "ipsilateral-alar-angle")).toBeCloseTo(iaa);
    expect(value(report, "iaa-jfa-deviation")).toBeCloseTo(Math.abs(iaa - jfa));
    expect(report.warnings).toEqual([]);
    expect(report.score).not.toBeNull();
  });

  it("uses FaceIQ's separate ranges for men and women", () => {
    const men = measureFrontHarmony(face, "male");
    const women = measureFrontHarmony(face, "female");
    expect(metric(men, "canthal-tilt").ideal).toBe("6.0° – 7.7°");
    // Women's pages list 6.8–8.5° and 8.5–10.2°; the range covers both.
    expect(metric(women, "canthal-tilt").ideal).toBe("6.8° – 10.2°");
    expect(metric(men, "bigonial-width").ideal).toBe("87.5% – 91.5%");
    expect(metric(women, "bigonial-width").ideal).toBe("84.0% – 88.0%");
    expect(metric(women, "canthal-tilt").source).toContain("women");
  });

  it("gives the same measurements when the head is tilted", () => {
    const tilted = Object.fromEntries(
      Object.entries(face).map(([key, point]) => [key, rotatePoint(point, { x: 500, y: 500 }, 12)]),
    ) as unknown as FrontFacePoints;
    const upright = measureFrontHarmony(face, "male");
    const rotated = measureFrontHarmony(tilted, "male");

    for (const item of upright.metrics) {
      expect(value(rotated, item.id)).toBeCloseTo(item.value, 1);
    }
    expect(rotated.warnings.some((warning) => warning.includes("tilted"))).toBe(true);
  });
});

describe("side profile harmony", () => {
  // Facing right: the nose points toward +x.
  const profile: SideProfilePoints = {
    glabella: { x: 300, y: 200 },
    nasion: { x: 290, y: 250 },
    orbitale: { x: 250, y: 270 },
    tragus: { x: 120, y: 280 },
    noseTip: { x: 360, y: 330 },
    columella: { x: 340, y: 345 },
    subnasale: { x: 310, y: 350 },
    alarCrease: { x: 285, y: 335 },
    upperLip: { x: 318, y: 385 },
    lowerLip: { x: 314, y: 420 },
    chin: { x: 305, y: 480 },
    menton: { x: 270, y: 510 },
    throat: { x: 190, y: 520 },
    neck: { x: 190, y: 620 },
  };

  it("measures angles and ratios directly from the tapped points", () => {
    const report = measureSideHarmony(profile, "neutral");
    expect(value(report, "submental-cervical-angle")).toBeCloseTo(
      angleAt(profile.menton, profile.throat, profile.neck),
      2,
    );
    expect(value(report, "nasolabial-angle")).toBeCloseTo(
      angleAt(profile.columella, profile.subnasale, profile.upperLip),
      2,
    );
    expect(value(report, "nasal-projection")).toBeCloseTo(
      distance(profile.alarCrease, profile.noseTip) / distance(profile.nasion, profile.noseTip),
      2,
    );
    expect(report.warnings).toEqual([]);
  });

  it("reports lips behind a profile line as positive millimetres", () => {
    const behind = measureSideHarmony(profile, "neutral");
    const forward = measureSideHarmony(
      { ...profile, lowerLip: { x: 360, y: 420 } as Point },
      "neutral",
    );
    expect(value(behind, "lower-lip-e-line")).toBeGreaterThan(0);
    expect(value(forward, "lower-lip-e-line")).toBeLessThan(0);
  });

  it("gives the same millimetres at any photo size, scaled to average face height", () => {
    const doubled = Object.fromEntries(
      Object.entries(profile).map(([key, point]) => [key, { x: point.x * 2, y: point.y * 2 }]),
    ) as SideProfilePoints;
    const original = measureSideHarmony(profile, "male");
    const larger = measureSideHarmony(doubled, "male");
    for (const item of original.metrics) {
      expect(value(larger, item.id)).toBeCloseTo(item.value, 1);
    }

    const pxPerMm = distance(profile.nasion, midpoint(profile.chin, profile.menton)) / 121.3;
    const frankfort = direction(profile.tragus, profile.orbitale);
    const recession =
      dot(
        { x: profile.nasion.x - profile.chin.x, y: profile.nasion.y - profile.chin.y },
        frankfort,
      ) / pxPerMm;
    expect(value(original, "chin-recession")).toBeCloseTo(recession, 2);
    const recessed = measureSideHarmony({ ...profile, chin: { x: 270, y: 480 } }, "male");
    expect(value(recessed, "chin-recession")).toBeGreaterThan(value(original, "chin-recession"));
  });

  it("warns when the points are clearly out of place", () => {
    const report = measureSideHarmony({ ...profile, noseTip: { x: 200, y: 330 } }, "neutral");
    expect(report.warnings.length).toBe(1);
  });
});

describe("body side posture", () => {
  // Facing right: the ear sits in front of the base of the neck.
  const side: BodySidePoints = {
    tragus: { x: 330, y: 100 },
    c7: { x: 280, y: 130 },
    acromion: { x: 300, y: 160 },
    hip: { x: 290, y: 450 },
    knee: { x: 295, y: 700 },
    ankle: { x: 285, y: 950 },
  };
  const degrees = (radians: number) => (radians * 180) / Math.PI;

  it("measures head, shoulder, and knee posture with the published definitions", () => {
    const report = measureBodySide(side);
    // Craniovertebral angle: level line through C7 to the line C7→ear.
    expect(value(report, "craniovertebral-angle")).toBeCloseTo(degrees(Math.atan2(30, 50)), 2);
    // Forward shoulder angle: vertical line through C7 to the line C7→shoulder tip.
    expect(value(report, "forward-shoulder-angle")).toBeCloseTo(degrees(Math.atan2(20, 30)), 2);
    // A knee in front of the hip–ankle line is slightly bent, reported as negative.
    expect(value(report, "knee-hyperextension")).toBeCloseTo(
      -(180 - angleAt(side.hip, side.knee, side.ankle)),
      2,
    );
    expect(metric(report, "craniovertebral-angle").score).toBeLessThan(5);
    expect(metric(report, "forward-shoulder-angle").score).toBe(10);
    expect(report.warnings).toEqual([]);
  });

  it("reports a knee behind the hip–ankle line as hyperextension", () => {
    const report = measureBodySide({ ...side, knee: { x: 270, y: 700 } });
    expect(value(report, "knee-hyperextension")).toBeGreaterThan(5);
    expect(metric(report, "knee-hyperextension").score).toBeLessThan(10);
  });

  it("measures the same whichever way the member faces", () => {
    const mirrored = Object.fromEntries(
      Object.entries(side).map(([key, point]) => [key, { x: 1000 - point.x, y: point.y }]),
    ) as BodySidePoints;
    const original = measureBodySide(side);
    const flipped = measureBodySide(mirrored);
    for (const item of original.metrics) {
      expect(value(flipped, item.id)).toBeCloseTo(item.value, 2);
    }
  });
});

function silhouette(width: number, height: number, rects: number[][]): SilhouetteMask {
  const data = new Float32Array(width * height);
  for (const [x1, y1, x2, y2] of rects) {
    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) data[y * width + x] = 1;
    }
  }
  return { width, height, data };
}

const point = (x: number, y: number, visibility = 0.95) => ({ x, y, visibility });

const pose: BodyPose = {
  nose: point(200, 70),
  leftShoulder: point(260, 140),
  rightShoulder: point(140, 140),
  leftElbow: point(330, 260),
  rightElbow: point(70, 260),
  leftWrist: point(335, 380),
  rightWrist: point(65, 380),
  leftHip: point(250, 350),
  rightHip: point(150, 350),
  leftKnee: point(248, 620),
  rightKnee: point(152, 620),
  leftAnkle: point(245, 880),
  rightAnkle: point(155, 880),
  leftHeel: point(245, 900),
  rightHeel: point(155, 900),
};

const bodyRects = [
  [170, 20, 230, 110], // head
  [185, 111, 215, 119], // neck
  [100, 120, 300, 160], // shoulders: 201 px
  [115, 161, 285, 240], // chest
  [130, 241, 270, 320], // waist: 141 px
  [110, 321, 290, 400], // hips: 181 px, crotch at y = 400
  [120, 401, 190, 900], // right leg
  [210, 401, 280, 900], // left leg
];
const frontView = { view: "front" as const, heightCm: 176 };

describe("body front and back harmony", () => {
  it("measures outline widths, leg length, and sourced posture checks", () => {
    const report = measureBodyHarmony(pose, silhouette(400, 920, bodyRects), frontView);

    expect(value(report, "shoulder-waist")).toBeCloseTo(201 / 141, 2);
    expect(value(report, "waist-hip")).toBeCloseTo(141 / 181, 2);
    expect(value(report, "shoulder-hip")).toBeCloseTo(201 / 181, 2);
    // Floor to crotch over head to floor.
    expect(value(report, "leg-body")).toBeCloseTo((900 - 400) / (900 - 20), 2);
    // Outline widths and leg length have no agreed photo ideal, so they aren't scored.
    for (const id of ["shoulder-waist", "waist-hip", "shoulder-hip", "leg-body"]) {
      expect(metric(report, id).score).toBeNull();
    }
    expect(value(report, "shoulder-height")).toBeCloseTo(0);
    expect(metric(report, "shoulder-height").ideal).toBe("under 1.0 cm");
    expect(value(report, "hip-level")).toBeCloseTo(0);
    expect(value(report, "knee-alignment")).toBeLessThan(3);
    expect(metric(report, "knee-alignment").score).toBe(10);
    expect(report.warnings).toEqual([]);
    expect(report.score).toBe(10);
  });

  it("converts shoulder height difference to centimetres with the member's height", () => {
    const uneven = { ...pose, rightShoulder: point(140, 150) };
    const report = measureBodyHarmony(uneven, silhouette(400, 920, bodyRects), frontView);
    // 10 px on an 880 px tall, 176 cm member is 2 cm.
    expect(value(report, "shoulder-height")).toBeCloseTo(2, 2);
    expect(metric(report, "shoulder-height").score).toBe(5);

    const noHeight = measureBodyHarmony(uneven, silhouette(400, 920, bodyRects), {
      view: "back",
      heightCm: null,
    });
    expect(metric(noHeight, "shoulder-height").reliable).toBe(false);
  });

  it("tells knock knees from bow legs", () => {
    const knockKneed = { ...pose, leftKnee: point(225, 620), rightKnee: point(175, 620) };
    const report = measureBodyHarmony(knockKneed, silhouette(400, 920, bodyRects), frontView);
    expect(value(report, "knee-alignment")).toBeGreaterThan(3);
    expect(metric(report, "knee-alignment").explanation).toContain("knock-kneed");
  });

  it("doesn't mistake the hem of loose shorts for the crotch", () => {
    // Fabric fills the gap between the legs down to y = 500, well below the hip joints.
    const report = measureBodyHarmony(
      pose,
      silhouette(400, 920, [...bodyRects, [191, 401, 209, 500]]),
      frontView,
    );
    expect(metric(report, "leg-body").reliable).toBe(false);
    expect(report.warnings.some((warning) => warning.includes("Loose clothing"))).toBe(true);
  });

  it("flags widths when the arms touch the sides and leg length when the legs touch", () => {
    const armsDown = {
      ...pose,
      leftWrist: point(300, 380),
      rightWrist: point(100, 380),
    };
    const report = measureBodyHarmony(
      armsDown,
      silhouette(400, 920, [
        ...bodyRects,
        [60, 150, 110, 420],
        [290, 150, 340, 420],
        [191, 401, 209, 900],
      ]),
      frontView,
    );

    expect(report.warnings.some((warning) => warning.includes("arms"))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes("legs"))).toBe(true);
    expect(metric(report, "waist-hip").reliable).toBe(false);
    expect(metric(report, "leg-body").reliable).toBe(false);
    expect(metric(report, "hip-level").reliable).toBe(true);
  });
});
