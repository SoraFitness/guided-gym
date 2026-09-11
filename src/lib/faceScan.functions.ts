import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { claimScanQuota } from "@/lib/scanQuota.functions";
import { fetchAscendrAi } from "@/lib/edge-functions.server";
import {
  contentText,
  formatScanDate,
  loadMemberContext,
  loadPhotoBytes,
  photoFingerprint,
  type OpenRouterResponse,
} from "@/lib/scanAnalysis.server";
import { FACE_CHANGE_RULES, isReferenceComparison, isReliableChange } from "@/lib/scanProgress";

const OPENROUTER_FACE_SCAN_MODEL = "qwen/qwen3-vl-32b-instruct";
const FACE_SCAN_ANALYSIS_VERSION = "face-progress-v1";

const Input = z.object({
  submissionId: z.string().uuid(),
});

const Score = z.number().min(0).max(100);
const Metric = z.object({
  score: Score,
  insight: z.string().min(1).max(280),
});
const ComparisonDeltas = z.object({
  overallScore: z.number().int().min(-100).max(100),
  facialSymmetry: z.number().int().min(-100).max(100),
  jawlineDefinition: z.number().int().min(-100).max(100),
  skinQuality: z.number().int().min(-100).max(100),
  eyeArea: z.number().int().min(-100).max(100),
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

const FaceScanSchema = z.object({
  photoUsable: z.boolean(),
  photoIssue: z.string().max(240).nullable(),
  overallScore: Score,
  overallSummary: z.string().min(1).max(500),
  facialSymmetry: Metric,
  jawlineDefinition: Metric,
  skinQuality: Metric,
  eyeArea: Metric,
  looksmaxPotential: Metric,
  strongestFeatures: z.array(z.string().min(1).max(180)).min(2).max(4),
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
  // Reports saved before face-progress-v1 have no comparison.
  comparison: ScanComparison.optional(),
});

export type FaceScanResult = z.infer<typeof FaceScanSchema>;

export function parseFaceScanResult(value: unknown): FaceScanResult | null {
  const parsed = FaceScanSchema.safeParse(value);
  return parsed.success ? normalizeResult(parsed.data) : null;
}

const metricJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    insight: { type: "string", maxLength: 280 },
  },
  required: ["score", "insight"],
} as const;

const faceScanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    photoUsable: { type: "boolean" },
    photoIssue: { type: ["string", "null"], maxLength: 240 },
    overallScore: { type: "number", minimum: 0, maximum: 100 },
    overallSummary: { type: "string", maxLength: 500 },
    facialSymmetry: metricJsonSchema,
    jawlineDefinition: metricJsonSchema,
    skinQuality: metricJsonSchema,
    eyeArea: metricJsonSchema,
    looksmaxPotential: metricJsonSchema,
    strongestFeatures: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", maxLength: 180 },
    },
    actionPlan: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 80 },
          detail: { type: "string", maxLength: 240 },
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
        summary: { type: "string", maxLength: 360 },
      },
      required: ["status", "direction", "confidence", "summary"],
    },
  },
  required: [
    "photoUsable",
    "photoIssue",
    "overallScore",
    "overallSummary",
    "facialSymmetry",
    "jawlineDefinition",
    "skinQuality",
    "eyeArea",
    "looksmaxPotential",
    "strongestFeatures",
    "actionPlan",
    "confidence",
    "comparison",
  ],
} as const;

const SYSTEM_PROMPT = `You are Ascendr's honest, encouraging appearance coach. Analyze only what is visibly present in the supplied face photo.

Return a subjective, photo-dependent appearance assessment. Lighting, angle, camera lens, expression, grooming, and image quality can materially change the result.

Score calibration (applies to every 0-100 score):
- 90-100: exceptional, model-level presentation in this photo. Very rare.
- 75-89: clearly above average, with strong features and polished presentation.
- 60-74: above average, with a few clear opportunities.
- 45-59: typical presentation with several clear opportunities.
- Below 45: presentation is noticeably held back by visible, changeable factors in this photo.
Score only what is visible. Use the full range and do not inflate scores to be encouraging; encouragement belongs in the insights and the plan.

Hard rules:
- Never identify the person. Never infer age, ethnicity, nationality, sex, gender, health, personality, intelligence, or lifestyle from the photo. You may use the self-reported MEMBER CONTEXT when it is supplied.
- Never diagnose skin, eye, or medical conditions. Discuss skin only as visible clarity, texture, evenness, or blemishes in this photo.
- Never insult, shame, sexualize, or use degrading language.
- Never present attractiveness, genetic potential, or a score as objective fact.
- Do not recommend surgery, injectables, prescription medication, extreme dieting, or unsafe interventions. For persistent skin concerns, suggest seeing a dermatologist rather than diagnosing.
- Keep every score plausible and internally consistent. Looksmax potential is an estimate of achievable presentation upside through safe, realistic changes. A higher score means stronger visible upside; it is not a judgment of worth and is not simply the inverse of the current score.
- Confidence must reflect how clearly this specific photo supports the assessment. Reduce it for uneven light, lens distortion, non-neutral expression, partial occlusion, or a non-frontal angle even when the image remains usable.
- If the image has no clear single face, is heavily filtered, too dark, too blurry, or too occluded, set photoUsable to false and explain the retake needed in photoIssue.

Action plan rules:
- Give 3-5 steps ordered by expected visible impact.
- Most steps must change how the person actually looks: haircut and hairstyle, facial hair and grooming, eyebrow grooming, a specific skincare routine, sleep and eye-area care, posture, or body-fat reduction for lower-face definition when the member's goals support it.
- At most one step may be about lighting, camera angle, or expression in photos.
- Never recommend jaw or neck exercises, mewing, chewing devices, or facial exercises to change facial structure; body-fat reduction, posture, and grooming such as beard shaping are the realistic levers.
- Tie every step to a specific finding in this photo and make it concrete: what to do, how often, and how long before a visible difference is realistic.

Write concise, respectful insights. Keep the overall summary under 320 characters, every metric insight under 220 characters, every strongest feature under 120 characters, every action detail under 180 characters, and the comparison summary under 240 characters. Use complete sentences and never end mid-sentence. Address the user directly. Return JSON only.`;

const USER_PROMPT = `Assess this face photo and return:
1. Overall Appearance Score (0-100): a subjective overall visual impression in this photo.
2. Facial Symmetry (0-100): how balanced the visible features appear, allowing for pose and angle.
3. Jawline Definition (0-100): visible jaw and lower-face definition.
4. Skin Quality (0-100): visible clarity, texture, evenness, and blemishes only; no diagnosis.
5. Eye Area (0-100): visible brightness, puffiness, dark circles, and signs of fatigue without health claims.
6. Looksmax Potential (0-100): realistic improvement potential through grooming, hairstyle, skincare, body composition, and presentation; opinion only.

Also provide a short overall summary, 2-4 strongest visible features, a prioritized 3-5 step action plan that follows the action plan rules, and the required comparison object. Make every insight photo-specific, explain what is visibly driving each score, and avoid generic filler.`;

const BASELINE_COMPARISON_PROMPT = `There is no previous Face Scan. Set comparison.status to baseline, comparison.direction to unchanged, and briefly explain that this report establishes the baseline.`;

const REFERENCE_COMPARISON_RULES = `Compare the two photos conservatively:
- Count only real appearance changes: skin clarity or texture, jawline and lower-face definition, eye-area freshness, hairstyle, facial hair, and grooming.
- Never count differences in lighting, lens distance, head angle, expression, makeup, or filters as change.
- Use change_detected only when such a change is clearly visible, and set direction to improved, regressed, or mixed.
- Otherwise use no_reliable_change with direction unchanged, and keep every score equal to the REFERENCE REPORT.
- When you detect a change, move only the scores it affects and keep the rest equal to the REFERENCE REPORT.
- comparison.confidence is your confidence in the change judgment, not general photo quality.
- comparison.summary names what changed, or why no change could be confirmed.
- In the action plan, follow up on the reference priorities: keep what is working and adjust what is not.`;

function shortenText(value: unknown, maxLength: number): unknown {
  if (typeof value !== "string") return value;
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength - 1);
  const wordBreak = candidate.lastIndexOf(" ");
  const end = wordBreak >= Math.floor(maxLength * 0.65) ? wordBreak : maxLength - 1;
  return `${candidate.slice(0, end).replace(/[,:;\-\s]+$/, "")}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeModelResult(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const trimMetric = (metric: unknown) =>
    isRecord(metric) ? { ...metric, insight: shortenText(metric.insight, 280) } : metric;
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
  const strongestFeatures = Array.isArray(value.strongestFeatures)
    ? value.strongestFeatures.map((feature) => shortenText(feature, 180))
    : value.strongestFeatures;
  const comparison = isRecord(value.comparison)
    ? { ...value.comparison, summary: shortenText(value.comparison.summary, 360) }
    : value.comparison;

  return {
    ...value,
    photoIssue: shortenText(value.photoIssue, 240),
    overallSummary: shortenText(value.overallSummary, 500),
    facialSymmetry: trimMetric(value.facialSymmetry),
    jawlineDefinition: trimMetric(value.jawlineDefinition),
    skinQuality: trimMetric(value.skinQuality),
    eyeArea: trimMetric(value.eyeArea),
    looksmaxPotential: trimMetric(value.looksmaxPotential),
    strongestFeatures,
    actionPlan,
    comparison,
  };
}

function parseModelJson(text: string): FaceScanResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = JSON.parse((fenced ?? object ?? text).trim());
  return FaceScanSchema.parse(sanitizeModelResult(parsed));
}

function normalizeResult(result: FaceScanResult): FaceScanResult {
  const roundMetric = (metric: FaceScanResult["facialSymmetry"]) => ({
    ...metric,
    score: Math.round(metric.score),
  });
  return {
    ...result,
    overallScore: Math.round(result.overallScore),
    facialSymmetry: roundMetric(result.facialSymmetry),
    jawlineDefinition: roundMetric(result.jawlineDefinition),
    skinQuality: roundMetric(result.skinQuality),
    eyeArea: roundMetric(result.eyeArea),
    looksmaxPotential: roundMetric(result.looksmaxPotential),
  };
}

type FaceScanComparison = NonNullable<FaceScanResult["comparison"]>;
type FaceScanDeltas = NonNullable<FaceScanComparison["scoreDeltas"]>;

interface PreviousFaceScan {
  id: string;
  record: Record<string, unknown>;
  analysis: FaceScanResult;
  photoPath: string;
  fingerprint: string | null;
  createdAt: string;
}

function comparisonDeltas(current: FaceScanResult, reference: FaceScanResult): FaceScanDeltas {
  return {
    overallScore: current.overallScore - reference.overallScore,
    facialSymmetry: current.facialSymmetry.score - reference.facialSymmetry.score,
    jawlineDefinition: current.jawlineDefinition.score - reference.jawlineDefinition.score,
    skinQuality: current.skinQuality.score - reference.skinQuality.score,
    eyeArea: current.eyeArea.score - reference.eyeArea.score,
  };
}

function anchorMetric<T extends { score: number }>(current: T, reference: T): T {
  return { ...current, score: reference.score };
}

function stabilizeAgainstReference(
  current: FaceScanResult,
  reference: PreviousFaceScan | null,
): FaceScanResult {
  if (!reference) {
    return {
      ...current,
      comparison: {
        status: "baseline",
        direction: "unchanged",
        confidence: current.comparison?.confidence ?? current.confidence,
        summary:
          current.comparison?.summary ??
          "This scan establishes your baseline. Use the same lighting and angle for future comparisons.",
        basis: "baseline",
        previousScanId: null,
        previousScanAt: null,
      },
    };
  }

  const deltas = comparisonDeltas(current, reference.analysis);
  const proposed = current.comparison;
  // Hairstyle and grooming changes mostly move the overall score, so it counts as evidence too.
  const supporting = [
    deltas.overallScore,
    deltas.jawlineDefinition,
    deltas.skinQuality,
    deltas.eyeArea,
  ];

  if (
    proposed &&
    isReliableChange(proposed, { overall: deltas.overallScore, supporting }, FACE_CHANGE_RULES)
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

  const previous = reference.analysis;
  const anchored: FaceScanResult = {
    ...current,
    overallScore: previous.overallScore,
    facialSymmetry: anchorMetric(current.facialSymmetry, previous.facialSymmetry),
    jawlineDefinition: anchorMetric(current.jawlineDefinition, previous.jawlineDefinition),
    skinQuality: anchorMetric(current.skinQuality, previous.skinQuality),
    eyeArea: anchorMetric(current.eyeArea, previous.eyeArea),
    looksmaxPotential: anchorMetric(current.looksmaxPotential, previous.looksmaxPotential),
  };
  return {
    ...anchored,
    comparison: {
      status: "no_reliable_change",
      direction: "unchanged",
      confidence: proposed?.confidence ?? Math.min(current.confidence, previous.confidence),
      summary:
        proposed?.status === "no_reliable_change"
          ? proposed.summary
          : "No reliable appearance change was visible after accounting for lighting, angle, and expression, so your scores were held steady.",
      basis: "visual_comparison",
      previousScanId: reference.id,
      previousScanAt: reference.createdAt,
      scoreDeltas: comparisonDeltas(anchored, previous),
    },
  };
}

function exactMatchResult(duplicate: PreviousFaceScan): FaceScanResult {
  return {
    ...duplicate.analysis,
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
        facialSymmetry: 0,
        jawlineDefinition: 0,
        skinQuality: 0,
        eyeArea: 0,
      },
    },
  };
}

function referenceReportPrompt(reference: PreviousFaceScan) {
  const report = reference.analysis;
  return [
    `Two labeled photos follow: the CURRENT PHOTO to analyze for this report, and the REFERENCE PHOTO from ${formatScanDate(reference.createdAt)}.`,
    `REFERENCE REPORT scores: overall ${report.overallScore}, facial symmetry ${report.facialSymmetry.score}, jawline definition ${report.jawlineDefinition.score}, skin quality ${report.skinQuality.score}, eye area ${report.eyeArea.score}, looksmax potential ${report.looksmaxPotential.score}.`,
    `REFERENCE priorities: ${report.actionPlan
      .slice(0, 3)
      .map((action) => `"${action.title}"`)
      .join("; ")}.`,
    REFERENCE_COMPARISON_RULES,
  ].join("\n");
}

function previousFaceScan(
  row: { id: string; result: Json; created_at: string },
  userId: string,
): PreviousFaceScan | null {
  if (!isRecord(row.result)) return null;
  const record = row.result;
  if (
    record.kind !== "scan_submission" ||
    record.scan_type !== "face" ||
    record.status !== "complete"
  ) {
    return null;
  }
  const analysis = parseFaceScanResult(record.analysis);
  const photoPaths = isRecord(record.photo_paths) ? record.photo_paths : null;
  const photoPath = photoPaths?.face;
  if (
    !analysis ||
    typeof photoPath !== "string" ||
    !photoPath.startsWith(`${userId}/scans/face/`)
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

export const analyzeFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator(Input)
  .handler(async ({ data, context }): Promise<FaceScanResult> => {
    const { supabase, userId } = context;

    const { data: row, error: readError } = await supabase
      .from("body_scans")
      .select("result")
      .eq("id", data.submissionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!row?.result || typeof row.result !== "object" || Array.isArray(row.result)) {
      throw new Error("Face scan submission not found.");
    }

    const existing = row.result as Record<string, Json | undefined>;
    if (existing.kind !== "scan_submission" || existing.scan_type !== "face") {
      throw new Error("Invalid face scan submission.");
    }
    const alreadyCompleted = parseFaceScanResult(existing.analysis);
    if (existing.status === "complete" && alreadyCompleted) return alreadyCompleted;

    const photoPaths = existing.photo_paths;
    if (!photoPaths || typeof photoPaths !== "object" || Array.isArray(photoPaths)) {
      throw new Error("Face scan photo not found.");
    }
    const photoPath = (photoPaths as Record<string, Json | undefined>).face;
    if (typeof photoPath !== "string" || !photoPath.startsWith(`${userId}/scans/face/`)) {
      throw new Error("Invalid face scan photo.");
    }

    const processing: Json = {
      ...existing,
      status: "processing",
      model: OPENROUTER_FACE_SCAN_MODEL,
      analysis_version: FACE_SCAN_ANALYSIS_VERSION,
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
        throw new Error(signedError?.message ?? "Could not load face photo.");
      }

      fingerprint = await photoFingerprint(await loadPhotoBytes(signed.signedUrl));

      const { data: previousRows, error: previousRowsError } = await supabase
        .from("body_scans")
        .select("id,result,created_at")
        .eq("user_id", userId)
        .neq("id", data.submissionId)
        .contains("result", {
          kind: "scan_submission",
          scan_type: "face",
          status: "complete",
        })
        .order("created_at", { ascending: false })
        .limit(60);
      if (previousRowsError) throw new Error(previousRowsError.message);

      const previousScans = (previousRows ?? [])
        .map((previousRow) => previousFaceScan(previousRow, userId))
        .filter((scan): scan is PreviousFaceScan => scan !== null);
      const duplicate = previousScans.find((scan) => scan.fingerprint === fingerprint) ?? null;
      // Compare with the scan the current scores came from so gradual change accumulates.
      const reference =
        previousScans.find((scan) => isReferenceComparison(scan.analysis.comparison)) ?? null;

      if (duplicate) {
        const result = exactMatchResult(duplicate);
        const completed: Json = {
          ...existing,
          status: "complete",
          model: OPENROUTER_FACE_SCAN_MODEL,
          analysis_version: FACE_SCAN_ANALYSIS_VERSION,
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

      let referenceSignedUrl: string | null = null;
      if (reference) {
        const { data: referenceSigned, error: referenceSignedError } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(reference.photoPath, 60 * 10);
        if (referenceSignedError || !referenceSigned?.signedUrl) {
          console.warn(
            "Could not load the reference Face Scan for comparison:",
            referenceSignedError?.message ?? "Missing signed URL",
          );
        } else {
          referenceSignedUrl = referenceSigned.signedUrl;
        }
      }

      await claimScanQuota(supabase, data.submissionId, "face");

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

      const response = await fetchAscendrAi(context.accessToken, "face-scan", {
        model: OPENROUTER_FACE_SCAN_MODEL,
        temperature: 0,
        max_tokens: 1800,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ascendr_face_scan",
            strict: true,
            schema: faceScanJsonSchema,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter ${response.status}`);

      const rawResult = normalizeResult(parseModelJson(contentText(payload)));
      if (!rawResult.photoUsable) {
        throw new Error(
          `PHOTO_QUALITY:${rawResult.photoIssue || "Use a clearer, front-facing photo and try again."}`,
        );
      }
      const result = stabilizeAgainstReference(rawResult, referenceSignedUrl ? reference : null);

      const completed: Json = {
        ...existing,
        status: "complete",
        model: OPENROUTER_FACE_SCAN_MODEL,
        analysis_version: FACE_SCAN_ANALYSIS_VERSION,
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
      console.error("Face scan analysis failed:", rawMessage);
      const qualityMessage = rawMessage.startsWith("PHOTO_QUALITY:")
        ? rawMessage.replace("PHOTO_QUALITY:", "")
        : null;
      const quotaMessage = rawMessage.includes("Face Scan limit") ? rawMessage : null;
      const timedOut =
        error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      const invalidResponse = error instanceof SyntaxError || error instanceof z.ZodError;
      const userMessage = quotaMessage
        ? quotaMessage
        : qualityMessage
          ? qualityMessage
          : timedOut
            ? "Face analysis took too long. Your photo is saved—please try again."
            : invalidResponse
              ? "The AI returned an incomplete Face Scan. Please try again."
              : "Face analysis couldn't be completed. Please try again.";
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
        model: OPENROUTER_FACE_SCAN_MODEL,
        analysis_version: FACE_SCAN_ANALYSIS_VERSION,
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
