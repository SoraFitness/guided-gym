import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPENROUTER_FACE_SCAN_MODEL = "qwen/qwen3-vl-32b-instruct";

const Input = z.object({
  submissionId: z.string().uuid(),
});

const Score = z.number().min(0).max(100);
const Metric = z.object({
  score: Score,
  insight: z.string().min(1).max(280),
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
  ],
} as const;

const SYSTEM_PROMPT = `You are Ascendr's supportive visual appearance coach. Analyze only what is visibly present in the supplied face photo.

Return a subjective, photo-dependent appearance assessment. Lighting, angle, camera lens, expression, grooming, and image quality can materially change the result.

Hard rules:
- Never identify the person or infer age, ethnicity, nationality, sex, gender, health, personality, intelligence, or lifestyle.
- Never diagnose skin, eye, or medical conditions. Discuss skin only as visible clarity, texture, evenness, or blemishes in this photo.
- Never insult, shame, sexualize, or use degrading language.
- Never present attractiveness, genetic potential, or a score as objective fact.
- Do not recommend surgery, prescription medication, extreme dieting, or unsafe interventions.
- Keep advice practical: grooming, hairstyle, facial hair, basic skincare, sleep presentation, hydration, body composition in general terms, posture, lighting, expression, and photo technique.
- Use the full 0-100 range, but keep every score plausible and internally consistent. Looksmax potential is an encouraging estimate of achievable presentation upside through safe, realistic changes. A higher score means stronger visible upside; it is not a judgment of worth and is not simply the inverse of the current score.
- Confidence must reflect how clearly this specific photo supports the assessment. Reduce it for uneven light, lens distortion, non-neutral expression, partial occlusion, or a non-frontal angle even when the image remains usable.
- If the image has no clear single face, is heavily filtered, too dark, too blurry, or too occluded, set photoUsable to false and explain the retake needed in photoIssue.

Write concise, respectful insights. Keep the overall summary under 320 characters, every metric insight under 220 characters, every strongest feature under 120 characters, and every action detail under 180 characters. Use complete sentences and never end mid-sentence. Address the user directly. Return JSON only.`;

const USER_PROMPT = `Assess this face photo and return:
1. Overall Appearance Score (0-100): a subjective overall visual impression in this photo.
2. Facial Symmetry (0-100): how balanced the visible features appear, allowing for pose and angle.
3. Jawline Definition (0-100): visible jaw and lower-face definition.
4. Skin Quality (0-100): visible clarity, texture, evenness, and blemishes only; no diagnosis.
5. Eye Area (0-100): visible brightness, puffiness, dark circles, and signs of fatigue without health claims.
6. Looksmax Potential (0-100): realistic improvement potential through grooming, hairstyle, skincare, body composition, and better lighting/photos; opinion only.

Also provide a short overall summary, 2-4 strongest visible features, and a prioritized 3-5 step practical action plan. Make every insight photo-specific, explain what is visibly driving each score, and avoid generic filler.`;

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

function shortenText(value: unknown, maxLength: number): unknown {
  if (typeof value !== "string") return value;
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength - 1);
  const wordBreak = candidate.lastIndexOf(" ");
  const end = wordBreak >= Math.floor(maxLength * 0.65) ? wordBreak : maxLength - 1;
  return `${candidate.slice(0, end).replace(/[,:;\-\s]+$/, "")}…`;
}

function sanitizeModelResult(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const trimMetric = (metric: unknown) => {
    if (!metric || typeof metric !== "object" || Array.isArray(metric)) return metric;
    const item = metric as Record<string, unknown>;
    return { ...item, insight: shortenText(item.insight, 280) };
  };
  const actionPlan = Array.isArray(input.actionPlan)
    ? input.actionPlan.map((action) => {
        if (!action || typeof action !== "object" || Array.isArray(action)) return action;
        const item = action as Record<string, unknown>;
        return {
          ...item,
          title: shortenText(item.title, 80),
          detail: shortenText(item.detail, 240),
        };
      })
    : input.actionPlan;
  const strongestFeatures = Array.isArray(input.strongestFeatures)
    ? input.strongestFeatures.map((feature) => shortenText(feature, 180))
    : input.strongestFeatures;

  return {
    ...input,
    photoIssue: shortenText(input.photoIssue, 240),
    overallSummary: shortenText(input.overallSummary, 500),
    facialSymmetry: trimMetric(input.facialSymmetry),
    jawlineDefinition: trimMetric(input.jawlineDefinition),
    skinQuality: trimMetric(input.skinQuality),
    eyeArea: trimMetric(input.eyeArea),
    looksmaxPotential: trimMetric(input.looksmaxPotential),
    strongestFeatures,
    actionPlan,
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

export const analyzeFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(Input)
  .handler(async ({ data, context }): Promise<FaceScanResult> => {
    const { supabase, userId } = context;
    const key = process.env.OPENROUTER_FACE_SCAN_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("Face Scan AI is not configured.");

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
        throw new Error(signedError?.message ?? "Could not load face photo.");
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(90_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "X-Title": "Ascendr Face Scan",
        },
        body: JSON.stringify({
          model: OPENROUTER_FACE_SCAN_MODEL,
          temperature: 0.2,
          max_tokens: 1200,
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
          `PHOTO_QUALITY:${result.photoIssue || "Use a clearer, front-facing photo and try again."}`,
        );
      }

      const completed: Json = {
        ...existing,
        status: "complete",
        model: OPENROUTER_FACE_SCAN_MODEL,
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
        "Face scan analysis failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      const failed: Json = {
        ...existing,
        status: "failed",
        error: "Face analysis could not be completed.",
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
      const timeoutMessage =
        error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
          ? "Face analysis took too long. Your photo is saved—please try again."
          : null;
      throw new Error(
        qualityMessage ||
          timeoutMessage ||
          "Face analysis couldn't be completed. Please try again.",
      );
    }
  });
