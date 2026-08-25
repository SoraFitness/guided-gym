import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { claimScanQuota } from "@/lib/scanQuota.functions";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { fetchAscendrAi } from "@/lib/edge-functions.server";

const OPENROUTER_BODY_SCAN_MODEL = "qwen/qwen3-vl-32b-instruct";
const BODY_SCAN_ANALYSIS_VERSION = "body-consistency-v1";

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
  bodyFatMidpoint: z.number().min(-60).max(60),
});
const ScanComparison = z.object({
  status: z.enum(["baseline", "no_reliable_change", "change_detected"]),
  direction: z.enum(["improved", "regressed", "mixed", "unchanged"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(360),
  basis: z.enum(["baseline", "exact_match", "visual_comparison"]).optional(),
  previousScanId: z.string().uuid().nullable().optional(),
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

const SYSTEM_PROMPT = `You are Ascendr's supportive visual physique coach. Analyze only what is visibly present in the supplied full-body photo.

Return a subjective, photo-dependent fitness assessment. Pose, lighting, clothing, camera angle, muscle pump, hydration, and image quality can materially change the result.

Hard rules:
- Never identify the person or infer age, ethnicity, nationality, sex, gender, health, medical conditions, personality, intelligence, or lifestyle.
- Never diagnose a condition or present body composition as a medical measurement.
- Never insult, shame, sexualize, or use degrading language.
- Never present the scores, body-fat estimate, frame, proportions, or potential as objective fact or a genetic conclusion.
- Do not recommend surgery, prescription medication, performance-enhancing drugs, starvation, crash dieting, purging, dehydration, or other unsafe interventions.
- Keep advice practical and fitness-focused: resistance training, balanced conditioning, adequate protein, sustainable nutrition, recovery, posture, posing, and better scan-photo technique.
- Use the full 0-100 range while keeping every score plausible and internally consistent.
- Clearly distinguish shoulders, chest, back, arms, core, glutes, quads, hamstrings, and calves. Do not combine them into a generic upper-body or lower-body claim.
- For each muscle group, report visibility as clear, partial, or not_visible. If a group cannot genuinely be assessed from this photo, set score to null and visibility to not_visible instead of guessing. Keep partial-visibility scores cautious and mention the limitation.
- Overall Muscle Development should be broadly consistent with the visible muscle-group scores.
- Body-fat estimate must be a broad visual range, never an exact percentage. Make highPercent at least 3 points greater than lowPercent.
- Potential is an encouraging estimate of achievable physique upside through sustainable training, nutrition, recovery, and presentation. A higher score means stronger visible upside; it is an opinion, not a prediction, and is not simply the inverse of the current score.
- Confidence must reflect how clearly this specific photo supports the assessment. Reduce it for loose clothing, uneven light, perspective distortion, dramatic posing, partial cropping, or obscured muscle groups even when the image remains usable.
- When a PREVIOUS PHOTO is supplied, compare it conservatively with the CURRENT PHOTO. Only use change_detected when a visible physique difference is supported across comparable body regions and cannot reasonably be explained by pose, distance, lens, lighting, clothing, pump, or cropping. Otherwise use no_reliable_change and direction unchanged. Never infer progress from score differences alone.
- For a first scan with no previous photo, use comparison status baseline, direction unchanged, and explain that future scans can be compared.
- If there is no single clearly visible full body, the person is substantially cropped or obscured, the photo is too dark or blurry, or the image is nude or not fitness-appropriate, set photoUsable to false and explain the retake needed in photoIssue.

Write concise, respectful insights. Address the user directly. Return JSON only.`;

const USER_PROMPT = `Assess this full-body photo and return:
1. Overall Physique Score (0-100): a subjective summary of the visible physique in this photo.
2. Muscle Development (0-100): overall visible muscularity and development.
3. Muscle Group Breakdown: separate scores, visibility, and concise insights for shoulders, chest, back, arms, core, glutes, quads, hamstrings, and calves. Use null instead of inventing a score for a group that is not visible.
4. Body Fat Estimate: a broad visual percentage range with lowPercent and highPercent, not an exact measurement.
5. V-Taper (0-100): visible shoulder-to-waist proportions and upper-body shape.
6. Symmetry (0-100): visible left/right balance and overall body proportions, allowing for pose and angle.
7. Potential (0-100): realistic improvement potential based only on the visible frame, proportions, and current physique; opinion only.

Also provide a short overall summary, 2-4 strongest visible areas, a prioritized 3-5 step sustainable action plan, and the required comparison object. Make every insight photo-specific, explain what is visibly driving each score, and avoid generic filler.`;

const BASELINE_COMPARISON_PROMPT = `There is no previous Body Scan. Set comparison.status to baseline, comparison.direction to unchanged, and briefly explain that this report establishes the baseline.`;

const PREVIEW_SYSTEM_PROMPT = `You are Ascendr's visual physique rater. Analyze only what is visibly supported by the supplied full-body photo.

Return a concise scoring preview, not a medical or health assessment.

Hard rules:
- Never identify the person or infer age, ethnicity, nationality, sex, gender, health, medical conditions, personality, intelligence, or lifestyle.
- Never insult, shame, sexualize, or use degrading language.
- Score the current visible physique in this specific photo. Pose, lighting, clothing, camera angle, muscle pump, and image quality can affect the result.
- Use the full 0-100 range. Do not default most people to the 70s and do not inflate scores to be encouraging.
- Muscle measures overall visible muscular development. V-Taper measures visible shoulder-to-waist shape. Symmetry measures visible balance and proportions. Potential measures realistic improvement upside. Shoulders and Core measure their visibly supported development.
- visibleConditioning measures visible muscular definition relative to visible adiposity. It is not a body-fat percentage or a health judgment. Less visible definition and more visible adiposity must produce a lower conditioning score; clear muscular definition must produce a higher one.
- Scores must be internally consistent with the photo. Potential can be encouraging, but it must not inflate the current-physique factors.
- If there is no single clearly visible full body, the person is substantially cropped or obscured, the photo is too dark or blurry, or the image is nude or not fitness-appropriate, set photoUsable to false and explain the retake needed in photoIssue.

Return JSON only.`;

const PREVIEW_USER_PROMPT = `Score this photo for a locked Body Scan preview. Return photoUsable, photoIssue, confidence, visibleConditioning, and these six 0-100 metrics: muscle, vTaper, symmetry, potential, shoulders, and core. Judge only the current visible physique and avoid generous score clustering.`;

const PREVIOUS_SCAN_COMPARISON_PROMPT = `Two labeled photos follow. Analyze the CURRENT PHOTO for the report and compare it with the PREVIOUS PHOTO. Be conservative: set comparison.status to change_detected only when a genuine visible physique change is supported despite differences in photo conditions. Otherwise set it to no_reliable_change with direction unchanged. The comparison confidence is confidence in the change judgment, not general photo quality.`;

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: { message?: string };
}

function contentText(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

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

  return {
    ...result,
    overallScore: Math.round(result.overallScore),
    muscleDevelopment: roundMetric(result.muscleDevelopment),
    muscleGroups: {
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
    },
    bodyFatEstimate: {
      ...result.bodyFatEstimate,
      lowPercent,
      highPercent,
    },
    vTaper: roundMetric(result.vTaper),
    symmetry: roundMetric(result.symmetry),
    potential: roundMetric(result.potential),
  };
}

type BodyScanComparison = NonNullable<BodyScanAiResult["comparison"]>;
type BodyScanDeltas = NonNullable<BodyScanComparison["scoreDeltas"]>;

function comparisonDeltas(current: BodyScanAiResult, previous: BodyScanAiResult): BodyScanDeltas {
  const currentBodyFat =
    (current.bodyFatEstimate.lowPercent + current.bodyFatEstimate.highPercent) / 2;
  const previousBodyFat =
    (previous.bodyFatEstimate.lowPercent + previous.bodyFatEstimate.highPercent) / 2;
  return {
    overallScore: current.overallScore - previous.overallScore,
    muscleDevelopment: current.muscleDevelopment.score - previous.muscleDevelopment.score,
    vTaper: current.vTaper.score - previous.vTaper.score,
    symmetry: current.symmetry.score - previous.symmetry.score,
    bodyFatMidpoint: Math.round((currentBodyFat - previousBodyFat) * 10) / 10,
  };
}

function anchorMetric<T extends { score: number }>(current: T, previous: T): T {
  return { ...current, score: previous.score };
}

function anchorGroup<T extends { score: number | null }>(current: T, previous: T): T {
  if (current.score === null || previous.score === null) return current;
  return { ...current, score: previous.score };
}

function anchorScoresToPrevious(
  current: BodyScanAiResult,
  previous: BodyScanAiResult,
): BodyScanAiResult {
  return {
    ...current,
    overallScore: previous.overallScore,
    muscleDevelopment: anchorMetric(current.muscleDevelopment, previous.muscleDevelopment),
    muscleGroups: {
      upperBody: {
        shoulders: anchorGroup(
          current.muscleGroups.upperBody.shoulders,
          previous.muscleGroups.upperBody.shoulders,
        ),
        chest: anchorGroup(
          current.muscleGroups.upperBody.chest,
          previous.muscleGroups.upperBody.chest,
        ),
        back: anchorGroup(
          current.muscleGroups.upperBody.back,
          previous.muscleGroups.upperBody.back,
        ),
        arms: anchorGroup(
          current.muscleGroups.upperBody.arms,
          previous.muscleGroups.upperBody.arms,
        ),
      },
      core: {
        core: anchorGroup(current.muscleGroups.core.core, previous.muscleGroups.core.core),
      },
      lowerBody: {
        glutes: anchorGroup(
          current.muscleGroups.lowerBody.glutes,
          previous.muscleGroups.lowerBody.glutes,
        ),
        quads: anchorGroup(
          current.muscleGroups.lowerBody.quads,
          previous.muscleGroups.lowerBody.quads,
        ),
        hamstrings: anchorGroup(
          current.muscleGroups.lowerBody.hamstrings,
          previous.muscleGroups.lowerBody.hamstrings,
        ),
        calves: anchorGroup(
          current.muscleGroups.lowerBody.calves,
          previous.muscleGroups.lowerBody.calves,
        ),
      },
    },
    bodyFatEstimate: {
      ...current.bodyFatEstimate,
      lowPercent: previous.bodyFatEstimate.lowPercent,
      highPercent: previous.bodyFatEstimate.highPercent,
    },
    vTaper: anchorMetric(current.vTaper, previous.vTaper),
    symmetry: anchorMetric(current.symmetry, previous.symmetry),
    potential: anchorMetric(current.potential, previous.potential),
  };
}

function stabilizeAgainstPrevious(
  current: BodyScanAiResult,
  previous: BodyScanAiResult | null,
  previousScanId: string | null,
): BodyScanAiResult {
  if (!previous || !previousScanId) {
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
      },
    };
  }

  const deltas = comparisonDeltas(current, previous);
  const supportingChanges = [deltas.muscleDevelopment, deltas.vTaper, deltas.symmetry].filter(
    (delta) => Math.abs(delta) >= 3,
  ).length;
  const hasMeaningfulSignal =
    (Math.abs(deltas.overallScore) >= 3 && supportingChanges >= 1) ||
    (Math.abs(deltas.bodyFatMidpoint) >= 2 && supportingChanges >= 1) ||
    supportingChanges >= 2;
  const proposed = current.comparison;
  const changeIsReliable =
    proposed?.status === "change_detected" &&
    proposed.direction !== "unchanged" &&
    proposed.confidence >= 0.72 &&
    hasMeaningfulSignal;

  if (changeIsReliable) {
    return {
      ...current,
      comparison: {
        ...proposed,
        basis: "visual_comparison",
        previousScanId,
        scoreDeltas: deltas,
      },
    };
  }

  const anchored = anchorScoresToPrevious(current, previous);
  return {
    ...anchored,
    comparison: {
      status: "no_reliable_change",
      direction: "unchanged",
      confidence: proposed?.confidence ?? Math.min(current.confidence, previous.confidence),
      summary:
        proposed?.status === "no_reliable_change"
          ? proposed.summary
          : "No reliable physique change was visible after accounting for pose, lighting, distance, and clothing, so your scores were held steady.",
      basis: "visual_comparison",
      previousScanId,
      scoreDeltas: comparisonDeltas(anchored, previous),
    },
  };
}

function exactMatchResult(previous: BodyScanAiResult, previousScanId: string): BodyScanAiResult {
  return {
    ...previous,
    comparison: {
      status: "no_reliable_change",
      direction: "unchanged",
      confidence: 1,
      summary:
        "This exact photo was already analyzed, so Ascendr reused the same report and kept every score unchanged.",
      basis: "exact_match",
      previousScanId,
      scoreDeltas: {
        overallScore: 0,
        muscleDevelopment: 0,
        vTaper: 0,
        symmetry: 0,
        bodyFatMidpoint: 0,
      },
    },
  };
}

async function photoFingerprint(bytes: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `sha256:${hex}`;
}

async function loadPhotoBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Could not read scan photo (${response.status}).`);
  return response.arrayBuffer();
}

interface PreviousBodyScan {
  id: string;
  record: Record<string, unknown>;
  analysis: BodyScanAiResult;
  photoPath: string;
  fingerprint: string | null;
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
  const overallScore = Math.round(
    metrics.muscle * 0.2 +
      metrics.vTaper * 0.13 +
      metrics.symmetry * 0.13 +
      metrics.potential * 0.08 +
      metrics.shoulders * 0.13 +
      metrics.core * 0.13 +
      raw.visibleConditioning * 0.2,
  );
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
  row: { id: string; result: Json },
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
        .limit(30);
      if (previousRowsError) throw new Error(previousRowsError.message);

      const previousScans = (previousRows ?? [])
        .map((previousRow) => previousBodyScan(previousRow, userId))
        .filter((scan): scan is PreviousBodyScan => scan !== null);
      let duplicate = previousScans.find((scan) => scan.fingerprint === fingerprint) ?? null;
      let previous: PreviousBodyScan | null = previousScans[0] ?? null;
      let previousSignedUrl: string | null = null;

      if (!duplicate && previous) {
        const { data: previousSigned, error: previousSignedError } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(previous.photoPath, 60 * 10);
        if (previousSignedError || !previousSigned?.signedUrl) {
          console.warn(
            "Could not load the previous Body Scan for comparison:",
            previousSignedError?.message ?? "Missing signed URL",
          );
          previous = null;
        } else {
          previousSignedUrl = previousSigned.signedUrl;
          if (!previous.fingerprint) {
            try {
              const previousFingerprint = await photoFingerprint(
                await loadPhotoBytes(previousSignedUrl),
              );
              previous.fingerprint = previousFingerprint;
              await supabase
                .from("body_scans")
                .update({
                  result: {
                    ...previous.record,
                    photo_fingerprint: previousFingerprint,
                    analysis_version:
                      typeof previous.record.analysis_version === "string"
                        ? previous.record.analysis_version
                        : "legacy",
                  } as Json,
                })
                .eq("id", previous.id)
                .eq("user_id", userId);
              if (previousFingerprint === fingerprint) duplicate = previous;
            } catch (fingerprintError) {
              console.warn(
                "Could not fingerprint the previous Body Scan:",
                fingerprintError instanceof Error
                  ? fingerprintError.message
                  : "Unknown fingerprint error",
              );
            }
          }
        }
      }

      if (duplicate) {
        const result = exactMatchResult(duplicate.analysis, duplicate.id);
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

      const userContent =
        previous && previousSignedUrl
          ? [
              { type: "text", text: `${USER_PROMPT}\n\n${PREVIOUS_SCAN_COMPARISON_PROMPT}` },
              { type: "text", text: "CURRENT PHOTO" },
              { type: "image_url", image_url: { url: signed.signedUrl } },
              { type: "text", text: "PREVIOUS PHOTO" },
              { type: "image_url", image_url: { url: previousSignedUrl } },
            ]
          : [
              { type: "text", text: `${USER_PROMPT}\n\n${BASELINE_COMPARISON_PROMPT}` },
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
      const result = stabilizeAgainstPrevious(
        rawResult,
        previous?.analysis ?? null,
        previous?.id ?? null,
      );

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
