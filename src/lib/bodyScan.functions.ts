import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { claimScanQuota } from "@/lib/scanQuota.functions";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { fetchAscendrAi } from "@/lib/edge-functions.server";
import {
  contentText,
  formatScanDate,
  loadMemberContext,
  loadPhotoBytes,
  photoFingerprint,
  type OpenRouterResponse,
} from "@/lib/scanAnalysis.server";
import {
  BODY_CHANGE_RULES,
  isReferenceComparison,
  isReliableChange,
  physiqueOverallScore,
} from "@/lib/scanProgress";

const OPENROUTER_BODY_SCAN_MODEL = "qwen/qwen3-vl-235b-a22b-instruct";
const BODY_SCAN_ANALYSIS_VERSION = "body-progress-v2";

const Input = z.object({
  submissionId: z.string().uuid(),
});

const PreviewInput = z.object({
  photo: z
    .string()
    .max(3_500_000)
    .refine((value) => /^data:image\/(?:jpeg|png|webp);base64,/i.test(value), {
      message: "Use a JPEG, PNG, or WebP photo.",
    }),
});

const Score = z.number().min(0).max(100);
const PreviewMetrics = z.object({
  muscle: Score,
  vTaper: Score,
  symmetry: Score,
  potential: Score,
  shoulders: Score,
  core: Score,
});
const RawBodyScanPreviewSchema = z.object({
  photoUsable: z.boolean(),
  photoIssue: z.string().max(240).nullable(),
  metrics: PreviewMetrics,
  visibleConditioning: Score,
  confidence: z.number().min(0).max(1),
});
const BodyScanPreviewSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  metrics: PreviewMetrics,
});

export type BodyScanPreviewResult = z.infer<typeof BodyScanPreviewSchema>;
const Metric = z.object({
  score: Score,
  insight: z.string().min(1).max(280),
});
const MuscleGroupMetric = z.object({
  score: Score.nullable(),
  visibility: z.enum(["clear", "partial", "not_visible"]),
  insight: z.string().min(1).max(240),
});
const ComparisonDeltas = z.object({
  overallScore: z.number().int().min(-100).max(100),
  muscleDevelopment: z.number().int().min(-100).max(100),
  vTaper: z.number().int().min(-100).max(100),
  symmetry: z.number().int().min(-100).max(100),
  visibleConditioning: z.number().int().min(-100).max(100).optional(),
  bodyFatMidpoint: z.number().min(-60).max(60),
});
const ScanComparison = z.object({
  status: z.enum(["baseline", "no_reliable_change", "change_detected"]),
  direction: z.enum(["improved", "regressed", "mixed", "unchanged"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(360),
  basis: z.enum(["baseline", "exact_match", "visual_comparison"]).optional(),
  previousScanId: z.string().uuid().nullable().optional(),
  previousScanAt: z.string().nullable().optional(),
  scoreDeltas: ComparisonDeltas.optional(),
});

const BodyScanSchema = z.object({
  photoUsable: z.boolean(),
  photoIssue: z.string().max(240).nullable(),
  overallScore: Score,
  overallSummary: z.string().min(1).max(500),
  muscleDevelopment: Metric,
  muscleGroups: z.object({
    upperBody: z.object({
      shoulders: MuscleGroupMetric,
      chest: MuscleGroupMetric,
      back: MuscleGroupMetric,
      arms: MuscleGroupMetric,
    }),
    core: z.object({
      core: MuscleGroupMetric,
    }),
    lowerBody: z.object({
      glutes: MuscleGroupMetric,
      quads: MuscleGroupMetric,
      hamstrings: MuscleGroupMetric,
      calves: MuscleGroupMetric,
    }),
  }),
  bodyFatEstimate: z.object({
    lowPercent: z.number().int().min(3).max(60),
    highPercent: z.number().int().min(5).max(65),
    insight: z.string().min(1).max(280),
  }),
  vTaper: Metric,
  symmetry: Metric,
  // Reports saved before body-progress-v2 have no conditioning score.
  visibleConditioning: Score.optional(),
  potential: Metric,
  strongestAreas: z.array(z.string().min(1).max(180)).min(2).max(4),
  actionPlan: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        detail: z.string().min(1).max(240),
      }),
    )
    .min(3)
    .max(5),
  confidence: z.number().min(0).max(1),
  comparison: ScanComparison.optional(),
});

export type BodyScanAiResult = z.infer<typeof BodyScanSchema>;

export function parseBodyScanResult(value: unknown): BodyScanAiResult | null {
  const parsed = BodyScanSchema.safeParse(value);
  return parsed.success ? normalizeResult(parsed.data) : null;
}

const metricJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    insight: { type: "string" },
  },
  required: ["score", "insight"],
} as const;

const muscleGroupJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: ["number", "null"], minimum: 0, maximum: 100 },
    visibility: { type: "string", enum: ["clear", "partial", "not_visible"] },
    insight: { type: "string" },
  },
  required: ["score", "visibility", "insight"],
} as const;

const bodyScanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    photoUsable: { type: "boolean" },
    photoIssue: { type: ["string", "null"] },
    overallScore: { type: "number", minimum: 0, maximum: 100 },
    overallSummary: { type: "string" },
    muscleDevelopment: metricJsonSchema,
    muscleGroups: {
      type: "object",
      additionalProperties: false,
      properties: {
        upperBody: {
          type: "object",
          additionalProperties: false,
          properties: {
            shoulders: muscleGroupJsonSchema,
            chest: muscleGroupJsonSchema,
            back: muscleGroupJsonSchema,
            arms: muscleGroupJsonSchema,
          },
          required: ["shoulders", "chest", "back", "arms"],
        },
        core: {
          type: "object",
          additionalProperties: false,
          properties: { core: muscleGroupJsonSchema },
          required: ["core"],
        },
        lowerBody: {
          type: "object",
          additionalProperties: false,
          properties: {
            glutes: muscleGroupJsonSchema,
            quads: muscleGroupJsonSchema,
            hamstrings: muscleGroupJsonSchema,
            calves: muscleGroupJsonSchema,
          },
          required: ["glutes", "quads", "hamstrings", "calves"],
        },
      },
      required: ["upperBody", "core", "lowerBody"],
    },
    bodyFatEstimate: {
      type: "object",
      additionalProperties: false,
      properties: {
        lowPercent: { type: "integer", minimum: 3, maximum: 60 },
        highPercent: { type: "integer", minimum: 5, maximum: 65 },
        insight: { type: "string" },
      },
      required: ["lowPercent", "highPercent", "insight"],
    },
    vTaper: metricJsonSchema,
    symmetry: metricJsonSchema,
    visibleConditioning: { type: "number", minimum: 0, maximum: 100 },
    potential: metricJsonSchema,
    strongestAreas: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    actionPlan: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    comparison: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: {
          type: "string",
          enum: ["baseline", "no_reliable_change", "change_detected"],
        },
        direction: {
          type: "string",
          enum: ["improved", "regressed", "mixed", "unchanged"],
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        summary: { type: "string" },
      },
      required: ["status", "direction", "confidence", "summary"],
    },
  },
  required: [
    "photoUsable",
    "photoIssue",
    "overallScore",
    "overallSummary",
    "muscleDevelopment",
    "muscleGroups",
    "bodyFatEstimate",
    "vTaper",
    "symmetry",
    "visibleConditioning",
    "potential",
    "strongestAreas",
    "actionPlan",
    "confidence",
    "comparison",
  ],
} as const;

const bodyScanPreviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    photoUsable: { type: "boolean" },
    photoIssue: { type: ["string", "null"] },
    metrics: {
      type: "object",
      additionalProperties: false,
      properties: {
        muscle: { type: "number", minimum: 0, maximum: 100 },
        vTaper: { type: "number", minimum: 0, maximum: 100 },
        symmetry: { type: "number", minimum: 0, maximum: 100 },
        potential: { type: "number", minimum: 0, maximum: 100 },
        shoulders: { type: "number", minimum: 0, maximum: 100 },
        core: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["muscle", "vTaper", "symmetry", "potential", "shoulders", "core"],
    },
    visibleConditioning: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["photoUsable", "photoIssue", "metrics", "visibleConditioning", "confidence"],
} as const;

// Shared by the onboarding preview and the full report so a photo is rated on
// the same scale before and after someone subscribes.
const PHYSIQUE_SCORING_GUIDE = `Score calibration (applies to every 0-100 score):
- 90-100: elite, competition-level development and conditioning. Very rare.
- 75-89: clearly athletic, with well-developed muscle and visible definition.
- 60-74: fit, with noticeable muscle, some definition, and clear room to build.
- 45-59: typical recreational level, with limited visible development or definition.
- 30-44: early stage, with little visible muscle or definition.
- Below 30: very little visible development in this photo.
Score only what is visible. Use the full range and do not inflate scores to be encouraging; encouragement belongs in the insights and the plan.
Visible conditioning measures visible muscular definition relative to visible body fat. It is not a body-fat percentage or a health judgment: less definition and more visible fat must lower it, and clear definition must raise it.`;

const SYSTEM_PROMPT = `You are Ascendr's honest, encouraging physique coach. Analyze only what is visibly present in the supplied full-body photo.

Return a subjective, photo-dependent fitness assessment. Pose, lighting, clothing, camera angle, muscle pump, hydration, and image quality can materially change the result.

${PHYSIQUE_SCORING_GUIDE}

Hard rules:
- Never identify the person. Never infer age, ethnicity, nationality, sex, gender, health, medical conditions, personality, intelligence, or lifestyle from the photo. You may use the self-reported MEMBER CONTEXT when it is supplied.
- Never diagnose a condition or present body composition as a medical measurement.
- Never insult, shame, sexualize, or use degrading language.
- Never present the scores, body-fat estimate, frame, proportions, or potential as objective fact or a genetic conclusion.
- Do not recommend surgery, prescription medication, performance-enhancing drugs, starvation, crash dieting, purging, dehydration, or other unsafe interventions.
- Keep every score plausible and internally consistent.
- Clearly distinguish shoulders, chest, back, arms, core, glutes, quads, hamstrings, and calves. Do not combine them into a generic upper-body or lower-body claim.
- For each muscle group, report visibility as clear, partial, or not_visible. If a group cannot genuinely be assessed from this photo, set score to null and visibility to not_visible instead of guessing. Keep partial-visibility scores cautious and mention the limitation.
- Overall Muscle Development should be broadly consistent with the visible muscle-group scores.
- Body-fat estimate must be a broad visual range, never an exact percentage. Make highPercent at least 3 points greater than lowPercent.
- Calibrate the range to the sex given in the member context, using these reference bands. Female and male scales differ by roughly 8-10 points for the same visible leanness, so using the wrong scale makes the estimate badly wrong.
  - Female: essential 10-13, athletic 14-20, fit 21-24, average 25-31, above average 32+.
  - Male: essential 3-5, athletic 6-13, fit 14-17, average 18-24, above average 25+.
- If the member context gives no sex, say so in the body-fat insight, widen the range to at least 8 points, and never guess a sex from the photo.
- Potential is an estimate of achievable physique upside through sustainable training, nutrition, recovery, and presentation. A higher score means stronger visible upside; it is an opinion, not a prediction, and is not simply the inverse of the current score.
- Confidence must reflect how clearly this specific photo supports the assessment. Reduce it for loose clothing, uneven light, perspective distortion, dramatic posing, partial cropping, or obscured muscle groups even when the image remains usable.
- If there is no single clearly visible full body, the person is substantially cropped or obscured, the photo is too dark or blurry, or the image is nude or not fitness-appropriate, set photoUsable to false and explain the retake needed in photoIssue.

Action plan rules:
- Give 3-5 steps ordered by expected visible impact for this member: resistance training, conditioning, protein and nutrition, recovery, or posture.
- Tie every step to a specific finding in this photo (name the muscle group or proportion) and make it concrete: what to do, how often, and how to progress it.
- Match the member's goals, experience, schedule, and equipment when that context is supplied. Do not prescribe a calorie surplus to someone trying to lose weight, or aggressive cutting to someone building muscle, unless the photo clearly supports it and you explain why.
- At most one step may be about posing or scan-photo technique.
- Never target a muscle group you marked not_visible as if it had been assessed; you may suggest a rear or side photo to assess it.
- Skip generic filler such as "stay hydrated" or "be consistent" unless it is tied to a visible finding.

Write concise, respectful insights. Address the user directly. Return JSON only.`;

const USER_PROMPT = `Assess this full-body photo and return:
1. Overall Physique Score (0-100): a subjective summary of the visible physique in this photo.
2. Muscle Development (0-100): overall visible muscularity and development.
3. Muscle Group Breakdown: separate scores, visibility, and concise insights for shoulders, chest, back, arms, core, glutes, quads, hamstrings, and calves. Use null instead of inventing a score for a group that is not visible.
4. Body Fat Estimate: a broad visual percentage range with lowPercent and highPercent, not an exact measurement.
5. V-Taper (0-100): visible shoulder-to-waist proportions and upper-body shape.
6. Symmetry (0-100): visible left/right balance and overall body proportions, allowing for pose and angle.
7. Visible Conditioning (0-100): visible muscular definition relative to visible body fat.
8. Potential (0-100): realistic improvement potential based only on the visible frame, proportions, and current physique; opinion only.

Also provide a short overall summary, 2-4 strongest visible areas, a prioritized 3-5 step action plan that follows the action plan rules, and the required comparison object. Make every insight photo-specific, explain what is visibly driving each score, and avoid generic filler.`;

const BASELINE_COMPARISON_PROMPT = `There is no previous Body Scan. Set comparison.status to baseline, comparison.direction to unchanged, and briefly explain that this report establishes the baseline.`;

const REFERENCE_COMPARISON_RULES = `Compare the two photos conservatively:
- Use change_detected only when a genuine visible physique change (muscle size or shape, definition, or body-fat loss or gain) is supported across comparable body regions and cannot reasonably be explained by pose, distance, lens, lighting, clothing, pump, or cropping. Set direction to improved, regressed, or mixed.
- Otherwise use no_reliable_change with direction unchanged, and keep every score equal to the REFERENCE REPORT.
- When you detect a change, move only the scores for regions that visibly changed and keep the rest equal to the REFERENCE REPORT.
- comparison.confidence is your confidence in the change judgment, not general photo quality.
- comparison.summary names what changed and where, or why no change could be confirmed, in under 240 characters.
- In the action plan, follow up on the reference priorities: keep what is working and adjust what is not.`;

const PREVIEW_SYSTEM_PROMPT = `You are Ascendr's visual physique rater. Analyze only what is visibly supported by the supplied full-body photo.

Return a concise scoring preview, not a medical or health assessment.

${PHYSIQUE_SCORING_GUIDE}

Hard rules:
- Never identify the person or infer age, ethnicity, nationality, sex, gender, health, medical conditions, personality, intelligence, or lifestyle.
- Never insult, shame, sexualize, or use degrading language.
- Score the current visible physique in this specific photo. Pose, lighting, clothing, camera angle, muscle pump, and image quality can affect the result.
- Muscle measures overall visible muscular development. V-Taper measures visible shoulder-to-waist shape. Symmetry measures visible balance and proportions. Potential measures realistic improvement upside. Shoulders and Core measure their visibly supported development.
- Scores must be internally consistent with the photo. Potential can be encouraging, but it must not inflate the current-physique factors.
- If there is no single clearly visible full body, the person is substantially cropped or obscured, the photo is too dark or blurry, or the image is nude or not fitness-appropriate, set photoUsable to false and explain the retake needed in photoIssue.

Return JSON only.`;

const PREVIEW_USER_PROMPT = `Score this photo for a locked Body Scan preview. Return photoUsable, photoIssue, confidence, visibleConditioning, and these six 0-100 metrics: muscle, vTaper, symmetry, potential, shoulders, and core. Judge only the current visible physique and avoid generous score clustering.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shortenText(value: unknown, maxLength: number): unknown {
  return typeof value === "string" ? value.trim().slice(0, maxLength).trim() : value;
}

function sanitizeMetric(value: unknown, maxLength: number) {
  if (!isRecord(value)) return value;
  return {
    ...value,
    insight: shortenText(value.insight, maxLength),
  };
}

function sanitizeMuscleSection(value: unknown) {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, metric]) => [key, sanitizeMetric(metric, 240)]),
  );
}

function sanitizeModelResult(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const muscleGroups = isRecord(value.muscleGroups)
    ? {
        ...value.muscleGroups,
        upperBody: sanitizeMuscleSection(value.muscleGroups.upperBody),
        core: sanitizeMuscleSection(value.muscleGroups.core),
        lowerBody: sanitizeMuscleSection(value.muscleGroups.lowerBody),
      }
    : value.muscleGroups;
  const bodyFatEstimate = isRecord(value.bodyFatEstimate)
    ? {
        ...value.bodyFatEstimate,
        insight: shortenText(value.bodyFatEstimate.insight, 280),
      }
    : value.bodyFatEstimate;
  const strongestAreas = Array.isArray(value.strongestAreas)
    ? value.strongestAreas.map((area) => shortenText(area, 180))
    : value.strongestAreas;
  const actionPlan = Array.isArray(value.actionPlan)
    ? value.actionPlan.map((action) =>
        isRecord(action)
          ? {
              ...action,
              title: shortenText(action.title, 80),
              detail: shortenText(action.detail, 240),
            }
          : action,
      )
    : value.actionPlan;
  const comparison = isRecord(value.comparison)
    ? {
        ...value.comparison,
        summary: shortenText(value.comparison.summary, 360),
      }
    : value.comparison;

  return {
    ...value,
    photoIssue: shortenText(value.photoIssue, 240),
    overallSummary: shortenText(value.overallSummary, 500),
    muscleDevelopment: sanitizeMetric(value.muscleDevelopment, 280),
    muscleGroups,
    bodyFatEstimate,
    vTaper: sanitizeMetric(value.vTaper, 280),
    symmetry: sanitizeMetric(value.symmetry, 280),
    potential: sanitizeMetric(value.potential, 280),
    strongestAreas,
    actionPlan,
    comparison,
  };
}

function parseModelJson(text: string): BodyScanAiResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = JSON.parse((fenced ?? object ?? text).trim());
  return BodyScanSchema.parse(sanitizeModelResult(parsed));
}

function normalizeResult(result: BodyScanAiResult): BodyScanAiResult {
  const roundMetric = (metric: BodyScanAiResult["muscleDevelopment"]) => ({
    ...metric,
    score: Math.round(metric.score),
  });
  const lowPercent = Math.round(result.bodyFatEstimate.lowPercent);
  const requestedHigh = Math.round(result.bodyFatEstimate.highPercent);
  const highPercent = Math.min(65, Math.max(lowPercent + 3, requestedHigh));
  const roundGroup = (group: BodyScanAiResult["muscleGroups"]["upperBody"]["shoulders"]) => ({
    ...group,
    score: group.score === null ? null : Math.round(group.score),
  });

  const muscleDevelopment = roundMetric(result.muscleDevelopment);
  const muscleGroups = {
    upperBody: {
      shoulders: roundGroup(result.muscleGroups.upperBody.shoulders),
      chest: roundGroup(result.muscleGroups.upperBody.chest),
      back: roundGroup(result.muscleGroups.upperBody.back),
      arms: roundGroup(result.muscleGroups.upperBody.arms),
    },
    core: {
      core: roundGroup(result.muscleGroups.core.core),
    },
    lowerBody: {
      glutes: roundGroup(result.muscleGroups.lowerBody.glutes),
      quads: roundGroup(result.muscleGroups.lowerBody.quads),
      hamstrings: roundGroup(result.muscleGroups.lowerBody.hamstrings),
      calves: roundGroup(result.muscleGroups.lowerBody.calves),
    },
  };
  const vTaper = roundMetric(result.vTaper);
  const symmetry = roundMetric(result.symmetry);
  const potential = roundMetric(result.potential);
  const visibleConditioning =
    result.visibleConditioning === undefined ? undefined : Math.round(result.visibleConditioning);
  // Reports that rate conditioning use the same overall formula as the onboarding preview.
  const overallScore =
    visibleConditioning === undefined
      ? Math.round(result.overallScore)
      : physiqueOverallScore({
          muscle: muscleDevelopment.score,
          vTaper: vTaper.score,
          symmetry: symmetry.score,
          potential: potential.score,
          shoulders: muscleGroups.upperBody.shoulders.score ?? muscleDevelopment.score,
          core: muscleGroups.core.core.score ?? muscleDevelopment.score,
          conditioning: visibleConditioning,
        });

  return {
    ...result,
    overallScore,
    muscleDevelopment,
    muscleGroups,
    bodyFatEstimate: {
      ...result.bodyFatEstimate,
      lowPercent,
      highPercent,
    },
    vTaper,
    symmetry,
    visibleConditioning,
    potential,
  };
}

type BodyScanComparison = NonNullable<BodyScanAiResult["comparison"]>;
type BodyScanDeltas = NonNullable<BodyScanComparison["scoreDeltas"]>;

interface PreviousBodyScan {
  id: string;
  record: Record<string, unknown>;
  analysis: BodyScanAiResult;
  photoPath: string;
  fingerprint: string | null;
  createdAt: string;
}

function comparisonDeltas(current: BodyScanAiResult, reference: BodyScanAiResult): BodyScanDeltas {
  const currentBodyFat =
    (current.bodyFatEstimate.lowPercent + current.bodyFatEstimate.highPercent) / 2;
  const referenceBodyFat =
    (reference.bodyFatEstimate.lowPercent + reference.bodyFatEstimate.highPercent) / 2;
  return {
    overallScore: current.overallScore - reference.overallScore,
    muscleDevelopment: current.muscleDevelopment.score - reference.muscleDevelopment.score,
    vTaper: current.vTaper.score - reference.vTaper.score,
    symmetry: current.symmetry.score - reference.symmetry.score,
    ...(current.visibleConditioning !== undefined && reference.visibleConditioning !== undefined
      ? { visibleConditioning: current.visibleConditioning - reference.visibleConditioning }
      : {}),
    bodyFatMidpoint: Math.round((currentBodyFat - referenceBodyFat) * 10) / 10,
  };
}

function anchorMetric<T extends { score: number }>(current: T, reference: T): T {
  return { ...current, score: reference.score };
}

function anchorGroup<T extends { score: number | null }>(current: T, reference: T): T {
  if (current.score === null || reference.score === null) return current;
  return { ...current, score: reference.score };
}

function anchorScoresToReference(
  current: BodyScanAiResult,
  reference: BodyScanAiResult,
): BodyScanAiResult {
  const currentGroups = current.muscleGroups;
  const referenceGroups = reference.muscleGroups;
  return {
    ...current,
    overallScore: reference.overallScore,
    muscleDevelopment: anchorMetric(current.muscleDevelopment, reference.muscleDevelopment),
    muscleGroups: {
      upperBody: {
        shoulders: anchorGroup(
          currentGroups.upperBody.shoulders,
          referenceGroups.upperBody.shoulders,
        ),
        chest: anchorGroup(currentGroups.upperBody.chest, referenceGroups.upperBody.chest),
        back: anchorGroup(currentGroups.upperBody.back, referenceGroups.upperBody.back),
        arms: anchorGroup(currentGroups.upperBody.arms, referenceGroups.upperBody.arms),
      },
      core: {
        core: anchorGroup(currentGroups.core.core, referenceGroups.core.core),
      },
      lowerBody: {
        glutes: anchorGroup(currentGroups.lowerBody.glutes, referenceGroups.lowerBody.glutes),
        quads: anchorGroup(currentGroups.lowerBody.quads, referenceGroups.lowerBody.quads),
        hamstrings: anchorGroup(
          currentGroups.lowerBody.hamstrings,
          referenceGroups.lowerBody.hamstrings,
        ),
        calves: anchorGroup(currentGroups.lowerBody.calves, referenceGroups.lowerBody.calves),
      },
    },
    bodyFatEstimate: {
      ...current.bodyFatEstimate,
      lowPercent: reference.bodyFatEstimate.lowPercent,
      highPercent: reference.bodyFatEstimate.highPercent,
    },
    vTaper: anchorMetric(current.vTaper, reference.vTaper),
    symmetry: anchorMetric(current.symmetry, reference.symmetry),
    // Follow the reference exactly so a legacy reference keeps its saved overall score.
    visibleConditioning: reference.visibleConditioning,
    potential: anchorMetric(current.potential, reference.potential),
  };
}

function stabilizeAgainstReference(
  current: BodyScanAiResult,
  reference: PreviousBodyScan | null,
): BodyScanAiResult {
  if (!reference) {
    return {
      ...current,
      comparison: {
        status: "baseline",
        direction: "unchanged",
        confidence: current.comparison?.confidence ?? current.confidence,
        summary:
          current.comparison?.summary ??
          "This scan establishes your baseline. Repeat the pose and lighting for future comparisons.",
        basis: "baseline",
        previousScanId: null,
        previousScanAt: null,
      },
    };
  }

  const deltas = comparisonDeltas(current, reference.analysis);
  const proposed = current.comparison;
  const supporting = [
    deltas.muscleDevelopment,
    deltas.vTaper,
    ...(deltas.visibleConditioning === undefined ? [] : [deltas.visibleConditioning]),
  ];

  if (
    proposed &&
    isReliableChange(proposed, { overall: deltas.overallScore, supporting }, BODY_CHANGE_RULES)
  ) {
    return {
      ...current,
      comparison: {
        ...proposed,
        basis: "visual_comparison",
        previousScanId: reference.id,
        previousScanAt: reference.createdAt,
        scoreDeltas: deltas,
      },
    };
  }

  const anchored = normalizeResult(anchorScoresToReference(current, reference.analysis));
  return {
    ...anchored,
    comparison: {
      status: "no_reliable_change",
      direction: "unchanged",
      confidence:
        proposed?.confidence ?? Math.min(current.confidence, reference.analysis.confidence),
      summary:
        proposed?.status === "no_reliable_change"
          ? proposed.summary
          : "No reliable physique change was visible after accounting for pose, lighting, distance, and clothing, so your scores were held steady.",
      basis: "visual_comparison",
      previousScanId: reference.id,
      previousScanAt: reference.createdAt,
      scoreDeltas: comparisonDeltas(anchored, reference.analysis),
    },
  };
}

function exactMatchResult(duplicate: PreviousBodyScan): BodyScanAiResult {
  const analysis = duplicate.analysis;
  return {
    ...analysis,
    comparison: {
      status: "no_reliable_change",
      direction: "unchanged",
      confidence: 1,
      summary:
        "This exact photo was already analyzed, so Ascendr reused the same report and kept every score unchanged.",
      basis: "exact_match",
      previousScanId: duplicate.id,
      previousScanAt: duplicate.createdAt,
      scoreDeltas: {
        overallScore: 0,
        muscleDevelopment: 0,
        vTaper: 0,
        symmetry: 0,
        ...(analysis.visibleConditioning === undefined ? {} : { visibleConditioning: 0 }),
        bodyFatMidpoint: 0,
      },
    },
  };
}

function groupScore(group: { score: number | null }) {
  return group.score === null ? "not visible" : String(group.score);
}

function referenceReportPrompt(reference: PreviousBodyScan) {
  const report = reference.analysis;
  const groups = report.muscleGroups;
  return [
    `Two labeled photos follow: the CURRENT PHOTO to analyze for this report, and the REFERENCE PHOTO from ${formatScanDate(reference.createdAt)}.`,
    `REFERENCE REPORT scores: overall ${report.overallScore}, muscle development ${report.muscleDevelopment.score}, V-taper ${report.vTaper.score}, symmetry ${report.symmetry.score}, visible conditioning ${report.visibleConditioning ?? "not recorded"}, potential ${report.potential.score}, body-fat range ${report.bodyFatEstimate.lowPercent}-${report.bodyFatEstimate.highPercent}%.`,
    `REFERENCE muscle groups: shoulders ${groupScore(groups.upperBody.shoulders)}, chest ${groupScore(groups.upperBody.chest)}, back ${groupScore(groups.upperBody.back)}, arms ${groupScore(groups.upperBody.arms)}, core ${groupScore(groups.core.core)}, glutes ${groupScore(groups.lowerBody.glutes)}, quads ${groupScore(groups.lowerBody.quads)}, hamstrings ${groupScore(groups.lowerBody.hamstrings)}, calves ${groupScore(groups.lowerBody.calves)}.`,
    `REFERENCE priorities: ${report.actionPlan
      .slice(0, 3)
      .map((action) => `"${action.title}"`)
      .join("; ")}.`,
    REFERENCE_COMPARISON_RULES,
  ].join("\n");
}

const PREVIEW_CACHE_TTL_MS = 30 * 60 * 1000;
const previewCache = new Map<string, { result: BodyScanPreviewResult; expiresAt: number }>();

async function previewFingerprint(photo: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(photo));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parsePreviewModelJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = JSON.parse((fenced ?? object ?? text).trim());
  return RawBodyScanPreviewSchema.parse({
    ...parsed,
    photoIssue: shortenText(isRecord(parsed) ? parsed.photoIssue : null, 240),
  });
}

function buildBodyScanPreview(
  raw: z.infer<typeof RawBodyScanPreviewSchema>,
): BodyScanPreviewResult {
  const metrics = {
    muscle: Math.round(raw.metrics.muscle),
    vTaper: Math.round(raw.metrics.vTaper),
    symmetry: Math.round(raw.metrics.symmetry),
    potential: Math.round(raw.metrics.potential),
    shoulders: Math.round(raw.metrics.shoulders),
    core: Math.round(raw.metrics.core),
  };
  const overallScore = physiqueOverallScore({
    ...metrics,
    conditioning: raw.visibleConditioning,
  });
  return BodyScanPreviewSchema.parse({ overallScore, metrics });
}

export const analyzeBodyScanPreviewPhoto = createServerOnlyFn(
  async (photo: string): Promise<BodyScanPreviewResult> => {
    const fingerprint = await previewFingerprint(photo);
    const cached = previewCache.get(fingerprint);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    if (cached) previewCache.delete(fingerprint);
    try {
      claimRateLimit("body-scan-preview", { limit: 12, windowMs: 15 * 60 * 1_000 });
    } catch {
      throw new Error("Too many preview attempts. Wait a few minutes and try again.");
    }

    try {
      const response = await fetchAscendrAi(undefined, "body-scan-preview", {
        model: OPENROUTER_BODY_SCAN_MODEL,
        temperature: 0,
        max_tokens: 500,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ascendr_body_scan_preview",
            strict: true,
            schema: bodyScanPreviewJsonSchema,
          },
        },
        messages: [
          { role: "system", content: PREVIEW_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: PREVIEW_USER_PROMPT },
              { type: "image_url", image_url: { url: photo } },
            ],
          },
        ],
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter ${response.status}`);
      const raw = parsePreviewModelJson(contentText(payload));
      if (!raw.photoUsable) {
        throw new Error(
          `PHOTO_QUALITY:${raw.photoIssue || "Use a clear, uncropped full-body photo and try again."}`,
        );
      }
      const result = buildBodyScanPreview(raw);
      previewCache.set(fingerprint, { result, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS });
      if (previewCache.size > 100) {
        const oldestKey = previewCache.keys().next().value;
        if (typeof oldestKey === "string") previewCache.delete(oldestKey);
      }
      return result;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      if (rawMessage.startsWith("PHOTO_QUALITY:")) {
        throw new Error(rawMessage.replace("PHOTO_QUALITY:", ""));
      }
      if (rawMessage.startsWith("Too many preview attempts")) throw error;
      const timedOut =
        error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      if (timedOut) throw new Error("The preview took too long. Please try again.");
      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        throw new Error("The preview was incomplete. Please try that photo again.");
      }
      console.error("Body Scan preview failed:", rawMessage);
      throw new Error("Body Scan preview couldn't be completed. Please try again.");
    }
  },
);

export const analyzeBodyScanPreview = createServerFn({ method: "POST" })
  .validator(PreviewInput)
  .handler(async ({ data }): Promise<BodyScanPreviewResult> => {
    return analyzeBodyScanPreviewPhoto(data.photo);
  });

function previousBodyScan(
  row: { id: string; result: Json; created_at: string },
  userId: string,
): PreviousBodyScan | null {
  if (!isRecord(row.result)) return null;
  const record = row.result;
  if (
    record.kind !== "scan_submission" ||
    record.scan_type !== "body" ||
    record.status !== "complete"
  ) {
    return null;
  }
  const analysis = parseBodyScanResult(record.analysis);
  const photoPaths = isRecord(record.photo_paths) ? record.photo_paths : null;
  const photoPath = photoPaths?.body;
  if (
    !analysis ||
    typeof photoPath !== "string" ||
    !photoPath.startsWith(`${userId}/scans/body/`)
  ) {
    return null;
  }
  return {
    id: row.id,
    record,
    analysis,
    photoPath,
    fingerprint: typeof record.photo_fingerprint === "string" ? record.photo_fingerprint : null,
    createdAt: typeof record.analyzed_at === "string" ? record.analyzed_at : row.created_at,
  };
}

export const analyzeBodyScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator(Input)
  .handler(async ({ data, context }): Promise<BodyScanAiResult> => {
    const { supabase, userId } = context;
    const { data: row, error: readError } = await supabase
      .from("body_scans")
      .select("result")
      .eq("id", data.submissionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!row?.result || typeof row.result !== "object" || Array.isArray(row.result)) {
      throw new Error("Body scan submission not found.");
    }

    const existing = row.result as Record<string, Json | undefined>;
    if (existing.kind !== "scan_submission" || existing.scan_type !== "body") {
      throw new Error("Invalid body scan submission.");
    }
    const alreadyCompleted = parseBodyScanResult(existing.analysis);
    if (existing.status === "complete" && alreadyCompleted) return alreadyCompleted;

    const photoPaths = existing.photo_paths;
    if (!photoPaths || typeof photoPaths !== "object" || Array.isArray(photoPaths)) {
      throw new Error("Body scan photo not found.");
    }
    const photoPath = (photoPaths as Record<string, Json | undefined>).body;
    if (typeof photoPath !== "string" || !photoPath.startsWith(`${userId}/scans/body/`)) {
      throw new Error("Invalid body scan photo.");
    }

    const processing: Json = {
      ...existing,
      status: "processing",
      model: OPENROUTER_BODY_SCAN_MODEL,
      analysis_version: BODY_SCAN_ANALYSIS_VERSION,
      error: null,
      failure_code: null,
      updated_at: new Date().toISOString(),
    };
    const { error: processingError } = await supabase
      .from("body_scans")
      .update({ result: processing })
      .eq("id", data.submissionId)
      .eq("user_id", userId);
    if (processingError) throw new Error(processingError.message);

    let fingerprint: string | null = null;
    try {
      const { data: signed, error: signedError } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photoPath, 60 * 10);
      if (signedError || !signed?.signedUrl) {
        throw new Error(signedError?.message ?? "Could not load body photo.");
      }

      fingerprint = await photoFingerprint(await loadPhotoBytes(signed.signedUrl));

      const { data: previousRows, error: previousRowsError } = await supabase
        .from("body_scans")
        .select("id,result,created_at")
        .eq("user_id", userId)
        .neq("id", data.submissionId)
        .contains("result", {
          kind: "scan_submission",
          scan_type: "body",
          status: "complete",
        })
        .order("created_at", { ascending: false })
        .limit(60);
      if (previousRowsError) throw new Error(previousRowsError.message);

      const previousScans = (previousRows ?? [])
        .map((previousRow) => previousBodyScan(previousRow, userId))
        .filter((scan): scan is PreviousBodyScan => scan !== null);
      let duplicate = previousScans.find((scan) => scan.fingerprint === fingerprint) ?? null;
      // Compare with the scan the current scores came from, not simply the latest
      // one, so gradual change keeps accumulating until it is visible.
      let reference =
        previousScans.find((scan) => isReferenceComparison(scan.analysis.comparison)) ?? null;
      let referenceSignedUrl: string | null = null;

      if (!duplicate && reference) {
        const { data: referenceSigned, error: referenceSignedError } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(reference.photoPath, 60 * 10);
        if (referenceSignedError || !referenceSigned?.signedUrl) {
          console.warn(
            "Could not load the reference Body Scan for comparison:",
            referenceSignedError?.message ?? "Missing signed URL",
          );
          reference = null;
        } else {
          referenceSignedUrl = referenceSigned.signedUrl;
          if (!reference.fingerprint) {
            try {
              const referenceFingerprint = await photoFingerprint(
                await loadPhotoBytes(referenceSignedUrl),
              );
              reference.fingerprint = referenceFingerprint;
              await supabase
                .from("body_scans")
                .update({
                  result: {
                    ...reference.record,
                    photo_fingerprint: referenceFingerprint,
                    analysis_version:
                      typeof reference.record.analysis_version === "string"
                        ? reference.record.analysis_version
                        : "legacy",
                  } as Json,
                })
                .eq("id", reference.id)
                .eq("user_id", userId);
              if (referenceFingerprint === fingerprint) duplicate = reference;
            } catch (fingerprintError) {
              console.warn(
                "Could not fingerprint the reference Body Scan:",
                fingerprintError instanceof Error
                  ? fingerprintError.message
                  : "Unknown fingerprint error",
              );
            }
          }
        }
      }

      if (duplicate) {
        const result = exactMatchResult(duplicate);
        const completed: Json = {
          ...existing,
          status: "complete",
          model: OPENROUTER_BODY_SCAN_MODEL,
          analysis_version: BODY_SCAN_ANALYSIS_VERSION,
          photo_fingerprint: fingerprint,
          duplicate_of: duplicate.id,
          error: null,
          failure_code: null,
          analysis: result as unknown as Json,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: duplicateSaveError } = await supabase
          .from("body_scans")
          .update({ result: completed })
          .eq("id", data.submissionId)
          .eq("user_id", userId);
        if (duplicateSaveError) throw new Error(duplicateSaveError.message);
        return result;
      }

      await claimScanQuota(supabase, data.submissionId, "body");

      const memberContext = await loadMemberContext(supabase, userId);
      const promptText = (comparisonPrompt: string) =>
        [USER_PROMPT, memberContext, comparisonPrompt].filter(Boolean).join("\n\n");
      const userContent =
        reference && referenceSignedUrl
          ? [
              { type: "text", text: promptText(referenceReportPrompt(reference)) },
              { type: "text", text: "CURRENT PHOTO" },
              { type: "image_url", image_url: { url: signed.signedUrl } },
              { type: "text", text: "REFERENCE PHOTO" },
              { type: "image_url", image_url: { url: referenceSignedUrl } },
            ]
          : [
              { type: "text", text: promptText(BASELINE_COMPARISON_PROMPT) },
              { type: "image_url", image_url: { url: signed.signedUrl } },
            ];

      const response = await fetchAscendrAi(context.accessToken, "body-scan", {
        model: OPENROUTER_BODY_SCAN_MODEL,
        temperature: 0,
        max_tokens: 2600,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ascendr_body_scan",
            strict: true,
            schema: bodyScanJsonSchema,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: userContent,
          },
        ],
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter ${response.status}`);

      const rawResult = normalizeResult(parseModelJson(contentText(payload)));
      if (!rawResult.photoUsable) {
        throw new Error(
          `PHOTO_QUALITY:${rawResult.photoIssue || "Use a clear, uncropped full-body photo and try again."}`,
        );
      }
      const result = stabilizeAgainstReference(rawResult, referenceSignedUrl ? reference : null);

      const completed: Json = {
        ...existing,
        status: "complete",
        model: OPENROUTER_BODY_SCAN_MODEL,
        analysis_version: BODY_SCAN_ANALYSIS_VERSION,
        photo_fingerprint: fingerprint,
        compared_to: result.comparison?.previousScanId ?? null,
        error: null,
        failure_code: null,
        analysis: result as unknown as Json,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: saveError } = await supabase
        .from("body_scans")
        .update({ result: completed })
        .eq("id", data.submissionId)
        .eq("user_id", userId);
      if (saveError) throw new Error(saveError.message);

      return result;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Body scan analysis failed:", rawMessage);
      const qualityMessage = rawMessage.startsWith("PHOTO_QUALITY:")
        ? rawMessage.replace("PHOTO_QUALITY:", "")
        : null;
      const quotaMessage = rawMessage.includes("Body Scan limit") ? rawMessage : null;
      const timedOut =
        error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      const invalidResponse = error instanceof SyntaxError || error instanceof z.ZodError;
      const userMessage = quotaMessage
        ? quotaMessage
        : qualityMessage
          ? qualityMessage
          : timedOut
            ? "Body analysis took too long. Your photo is saved—please try again."
            : invalidResponse
              ? "The AI returned an incomplete Body Scan. Please try again."
              : "Body analysis couldn't be completed. Please try again.";
      const failureCode = quotaMessage
        ? "weekly_limit"
        : qualityMessage
          ? "photo_quality"
          : timedOut
            ? "timeout"
            : invalidResponse
              ? "invalid_ai_response"
              : "analysis_error";
      const failed: Json = {
        ...existing,
        status: "failed",
        model: OPENROUTER_BODY_SCAN_MODEL,
        analysis_version: BODY_SCAN_ANALYSIS_VERSION,
        ...(fingerprint ? { photo_fingerprint: fingerprint } : {}),
        error: userMessage,
        failure_code: failureCode,
        updated_at: new Date().toISOString(),
      };
      await supabase
        .from("body_scans")
        .update({ result: failed })
        .eq("id", data.submissionId)
        .eq("user_id", userId);
      throw new Error(userMessage);
    }
  });

/**
 * Runs the standard first-time Body Scan analysis on a single photo without
 * touching the member's scan history, weekly quota, or photo storage.
 *
 * Used by the internal marketing tool, where scans are run on other people and
 * must never be saved to the operator's account.
 */
export const analyzeBodyPhotoStandalone = createServerOnlyFn(
  async ({
    photo,
    accessToken,
    sex,
  }: {
    photo: string;
    accessToken?: string;
    /** Sex of the person in the photo, so the body-fat range is calibrated. */
    sex?: "male" | "female";
  }): Promise<BodyScanAiResult> => {
    const response = await fetchAscendrAi(accessToken, "body-scan", {
      model: OPENROUTER_BODY_SCAN_MODEL,
      temperature: 0,
      max_tokens: 2600,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ascendr_body_scan",
          strict: true,
          schema: bodyScanJsonSchema,
        },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                USER_PROMPT,
                sex
                  ? `MEMBER CONTEXT (supplied by the operator). Use it only to calibrate estimates; never infer anything else about the person.\n- Sex: ${sex}`
                  : null,
                BASELINE_COMPARISON_PROMPT,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
            { type: "image_url", image_url: { url: photo } },
          ],
        },
      ],
    });

    const payload = (await response.json()) as OpenRouterResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter ${response.status}`);

    const result = normalizeResult(parseModelJson(contentText(payload)));
    if (!result.photoUsable) {
      throw new Error(result.photoIssue || "Use a clear, uncropped full-body photo and try again.");
    }
    return result;
  },
);
