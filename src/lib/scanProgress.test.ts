import { describe, expect, it } from "vitest";
import {
  BODY_CHANGE_RULES,
  FACE_CHANGE_RULES,
  isReferenceComparison,
  isReliableChange,
  physiqueOverallScore,
} from "./scanProgress";

const improved = { status: "change_detected", direction: "improved", confidence: 0.82 } as const;

describe("scan progress rules", () => {
  it("measures new scans against the last scan whose scores came from its own photo", () => {
    expect(isReferenceComparison(undefined)).toBe(true);
    expect(isReferenceComparison({ status: "baseline", basis: "baseline" })).toBe(true);
    expect(isReferenceComparison({ status: "change_detected", basis: "visual_comparison" })).toBe(
      true,
    );
    expect(
      isReferenceComparison({ status: "no_reliable_change", basis: "visual_comparison" }),
    ).toBe(false);
    expect(isReferenceComparison({ status: "no_reliable_change", basis: "exact_match" })).toBe(
      false,
    );
  });

  it("ignores score movement that stays within photo-to-photo noise", () => {
    expect(isReliableChange(improved, { overall: 2, supporting: [4, 3] }, BODY_CHANGE_RULES)).toBe(
      false,
    );
  });

  it("accepts a confirmed improvement that clears the noise", () => {
    expect(isReliableChange(improved, { overall: 2, supporting: [6, 1] }, BODY_CHANGE_RULES)).toBe(
      true,
    );
  });

  it("rejects an improvement verdict when the scores actually fell", () => {
    expect(
      isReliableChange(improved, { overall: -3, supporting: [-6, 0] }, BODY_CHANGE_RULES),
    ).toBe(false);
  });

  it("reports regressions and mixed changes honestly", () => {
    const regressed = { ...improved, direction: "regressed" } as const;
    const mixed = { ...improved, direction: "mixed" } as const;
    expect(
      isReliableChange(regressed, { overall: -2, supporting: [-5, 0] }, FACE_CHANGE_RULES),
    ).toBe(true);
    expect(isReliableChange(mixed, { overall: 0, supporting: [5, -4] }, FACE_CHANGE_RULES)).toBe(
      true,
    );
    expect(isReliableChange(mixed, { overall: 3, supporting: [5, 1] }, FACE_CHANGE_RULES)).toBe(
      false,
    );
  });

  it("requires a confident change verdict", () => {
    expect(
      isReliableChange(
        { ...improved, confidence: 0.55 },
        { overall: 6, supporting: [9] },
        BODY_CHANGE_RULES,
      ),
    ).toBe(false);
    expect(
      isReliableChange(
        { status: "no_reliable_change", direction: "unchanged", confidence: 0.9 },
        { overall: 6, supporting: [9] },
        BODY_CHANGE_RULES,
      ),
    ).toBe(false);
  });

  it("calculates the overall physique score from its components", () => {
    // Component scores from a live onboarding preview of the sample photo.
    expect(
      physiqueOverallScore({
        muscle: 78,
        vTaper: 65,
        symmetry: 82,
        potential: 75,
        shoulders: 70,
        core: 80,
        conditioning: 85,
      }),
    ).toBe(77);
  });
});
