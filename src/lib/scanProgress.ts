// Shared progress rules for Body and Face Scans. Scores read from a single
// photo wobble by a few points even at temperature 0 (up to ±5 on body
// sub-scores when the same photo was scanned twice), so a change only counts
// when the vision model confirms it AND the score movement clears that noise in
// the direction the model reported.

export type ScanComparisonStatus = "baseline" | "no_reliable_change" | "change_detected";
export type ScanComparisonDirection = "improved" | "regressed" | "mixed" | "unchanged";

export interface ScanChangeProposal {
  status: ScanComparisonStatus;
  direction: ScanComparisonDirection;
  confidence: number;
}

export interface ScanChangeRules {
  minConfidence: number;
  /** Smallest score movement that is larger than photo-to-photo noise. */
  minScoreChange: number;
}

export const BODY_CHANGE_RULES: ScanChangeRules = { minConfidence: 0.7, minScoreChange: 5 };
export const FACE_CHANGE_RULES: ScanChangeRules = { minConfidence: 0.7, minScoreChange: 4 };

/**
 * A reference scan is one whose scores came from its own analysis: a baseline,
 * a confirmed change, or a report saved before comparisons existed. Scans that
 * held their scores are skipped, so gradual change keeps being measured against
 * the photo those scores came from instead of disappearing scan by scan.
 */
export function isReferenceComparison(
  comparison: { status?: string; basis?: string } | null | undefined,
) {
  if (!comparison) return true;
  if (comparison.basis === "exact_match") return false;
  return comparison.status === "baseline" || comparison.status === "change_detected";
}

export function isReliableChange(
  proposal: ScanChangeProposal | null | undefined,
  deltas: { overall: number; supporting: number[] },
  rules: ScanChangeRules,
) {
  if (!proposal || proposal.status !== "change_detected") return false;
  if (proposal.confidence < rules.minConfidence) return false;

  const gains = deltas.supporting.filter((delta) => delta >= rules.minScoreChange).length;
  const losses = deltas.supporting.filter((delta) => delta <= -rules.minScoreChange).length;
  switch (proposal.direction) {
    case "improved":
      return gains > 0 && losses === 0 && deltas.overall > 0;
    case "regressed":
      return losses > 0 && gains === 0 && deltas.overall < 0;
    case "mixed":
      return gains > 0 && losses > 0;
    default:
      return false;
  }
}

export interface PhysiqueComponents {
  muscle: number;
  vTaper: number;
  symmetry: number;
  potential: number;
  shoulders: number;
  core: number;
  conditioning: number;
}

/** The overall physique score, calculated the same way for the onboarding preview and full scans. */
export function physiqueOverallScore(components: PhysiqueComponents) {
  return Math.round(
    components.muscle * 0.2 +
      components.vTaper * 0.13 +
      components.symmetry * 0.13 +
      components.potential * 0.08 +
      components.shoulders * 0.13 +
      components.core * 0.13 +
      components.conditioning * 0.2,
  );
}
