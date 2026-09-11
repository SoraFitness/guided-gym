import type { Box, Point } from "./geometry";

// Harmony metrics are measured proportions compared with published ranges. A metric
// without a published ideal is still measured and shown, but never scored.

export type HarmonySex = "male" | "female" | "neutral";
export type HarmonyFormat = "degrees" | "ratio" | "percent" | "mm" | "cm";

/** Use -Infinity or Infinity for a range that is open on one side ("under 52°"). */
export interface IdealRange {
  min: number;
  max: number;
}

export interface HarmonyAngle {
  vertex: Point;
  from: Point;
  to: Point;
}

export interface HarmonyOverlay {
  lines: Array<[Point, Point]>;
  angles: HarmonyAngle[];
  points: Point[];
}

export interface HarmonyMetric {
  id: string;
  label: string;
  value: number;
  display: string;
  /** The ideal range as text, or null when there is no agreed ideal to compare with. */
  ideal: string | null;
  /** 0–10 (10 inside the ideal range), or null when the metric has no ideal. */
  score: number | null;
  explanation: string;
  /** Where the ideal range comes from. */
  source: string | null;
  overlay: HarmonyOverlay;
  /** False when this photo can't support the measurement; left out of the overall score. */
  reliable: boolean;
}

export interface HarmonyReport {
  /** Average of the reliable, scored metrics, 0–10, or null when none could be scored. */
  score: number | null;
  metrics: HarmonyMetric[];
  warnings: string[];
  /** The region of the photo the metrics cover, in image pixels. */
  focus: Box;
}

// Shape of the score curve outside the ideal range. With this power the curve
// reproduces FaceIQ Labs' published example scores (for example 110.8° on a
// 94–106° range scoring 9.2/10).
const FALLOFF_POWER = 1.7;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function idealFor(
  sex: HarmonySex,
  ranges: { male: IdealRange; female: IdealRange },
): IdealRange {
  if (sex !== "neutral") return ranges[sex];
  return {
    min: round((ranges.male.min + ranges.female.min) / 2, 3),
    max: round((ranges.male.max + ranges.female.max) / 2, 3),
  };
}

/**
 * 10 inside the ideal range. Outside it the score eases off gently, then faster,
 * reaching 5 at `tolerance` beyond the nearest edge and approaching 0 further out.
 */
export function harmonyScore(value: number, ideal: IdealRange, tolerance: number) {
  const outside = value < ideal.min ? ideal.min - value : value > ideal.max ? value - ideal.max : 0;
  if (!outside) return 10;
  return round(10 * Math.exp(-Math.LN2 * (outside / tolerance) ** FALLOFF_POWER), 1);
}

export function formatHarmonyValue(value: number, format: HarmonyFormat) {
  if (format === "degrees") return `${value.toFixed(1)}°`;
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "mm") return `${value.toFixed(1)} mm`;
  if (format === "cm") return `${value.toFixed(1)} cm`;
  return `${value.toFixed(2)}x`;
}

export function formatIdealRange(ideal: IdealRange, format: HarmonyFormat) {
  if (ideal.min === -Infinity) return `under ${formatHarmonyValue(ideal.max, format)}`;
  if (ideal.max === Infinity) return `${formatHarmonyValue(ideal.min, format)} or more`;
  return `${formatHarmonyValue(ideal.min, format)} – ${formatHarmonyValue(ideal.max, format)}`;
}

export function harmonyMetric(input: {
  id: string;
  label: string;
  value: number;
  format: HarmonyFormat;
  /** Leave out when no published ideal exists; the metric is then shown but not scored. */
  ideal?: IdealRange;
  /** How far outside the ideal range the score drops to 5. */
  tolerance?: number;
  source?: string;
  explanation: string;
  overlay: Partial<HarmonyOverlay>;
  reliable?: boolean;
}): HarmonyMetric {
  const scored = input.ideal && input.tolerance ? input.ideal : null;
  return {
    id: input.id,
    label: input.label,
    value: round(input.value, 3),
    display: formatHarmonyValue(input.value, input.format),
    ideal: scored ? formatIdealRange(scored, input.format) : null,
    score: scored && input.tolerance ? harmonyScore(input.value, scored, input.tolerance) : null,
    explanation: input.explanation,
    source: scored ? (input.source ?? null) : null,
    overlay: {
      lines: input.overlay.lines ?? [],
      angles: input.overlay.angles ?? [],
      points: input.overlay.points ?? [],
    },
    reliable: input.reliable ?? true,
  };
}

export function harmonyReport(
  metrics: HarmonyMetric[],
  warnings: string[],
  focus: Box,
): HarmonyReport {
  const scored = metrics.filter((metric) => metric.reliable && metric.score !== null);
  return {
    score: scored.length
      ? round(scored.reduce((sum, metric) => sum + (metric.score ?? 0), 0) / scored.length, 1)
      : null,
    metrics,
    warnings,
    focus,
  };
}
