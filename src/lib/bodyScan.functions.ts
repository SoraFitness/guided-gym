import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENROUTER_BODY_SCAN_MODEL = "qwen/qwen3-vl-32b-instruct";

const Input = z.object({
  submissionId: z.string().uuid(),
});

const Score = z.number().min(0).max(100);
const Metric = z.object({
  score: Score,
  insight: z.string().min(1).max(280),
});
const MuscleGroupMetric = z.object({
  score: Score.nullable(),
  visibility: z.enum(["clear", "partial", "not_visible"]),
  insight: z.string().min(1).max(240),
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
  ],
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

Also provide a short overall summary, 2-4 strongest visible areas, and a prioritized 3-5 step sustainable action plan. Make every insight photo-specific, explain what is visibly driving each score, and avoid generic filler.`;

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

function parseModelJson(text: string): BodyScanAiResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = JSON.parse((fenced ?? object ?? text).trim());
  return BodyScanSchema.parse(parsed);
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

export const analyzeBodyScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(Input)
  .handler(async ({ data, context }): Promise<BodyScanAiResult> => {
    const { supabase, userId } = context;
    const key = process.env.OPENROUTER_BODY_SCAN_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("Body Scan AI is not configured.");

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
      updated_at: new Date().toISOString(),
    };
    const { error: processingError } = await supabase
      .from("body_scans")
      .update({ result: processing })
      .eq("id", data.submissionId)
      .eq("user_id", userId);
    if (processingError) throw new Error(processingError.message);

    try {
      const { data: signed, error: signedError } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photoPath, 60 * 10);
      if (signedError || !signed?.signedUrl) {
        throw new Error(signedError?.message ?? "Could not load body photo.");
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(90_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "Ascendr Body Scan",
        },
        body: JSON.stringify({
          model: OPENROUTER_BODY_SCAN_MODEL,
          temperature: 0.2,
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
                { type: "text", text: USER_PROMPT },
                { type: "image_url", image_url: { url: signed.signedUrl } },
              ],
            },
          ],
        }),
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter ${response.status}`);

      const result = normalizeResult(parseModelJson(contentText(payload)));
      if (!result.photoUsable) {
        throw new Error(
          `PHOTO_QUALITY:${result.photoIssue || "Use a clear, uncropped full-body photo and try again."}`,
        );
      }

      const completed: Json = {
        ...existing,
        status: "complete",
        model: OPENROUTER_BODY_SCAN_MODEL,
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
      console.error(
        "Body scan analysis failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      const failed: Json = {
        ...existing,
        status: "failed",
        error: "Body analysis could not be completed.",
        updated_at: new Date().toISOString(),
      };
      await supabase
        .from("body_scans")
        .update({ result: failed })
        .eq("id", data.submissionId)
        .eq("user_id", userId);
      const qualityMessage =
        error instanceof Error && error.message.startsWith("PHOTO_QUALITY:")
          ? error.message.replace("PHOTO_QUALITY:", "")
          : null;
      throw new Error(qualityMessage || "Body analysis couldn't be completed. Please try again.");
    }
  });
