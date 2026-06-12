import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  levelFor,
  mockScanFor,
  SCAN_DISCLAIMER,
  type BodyScanResult,
} from "./bodyScan";
import type { Profile } from "./profile";

const ProfileSlim = z.object({
  name: z.string(),
  goal: z.string(),
  experience: z.string(),
  daysPerWeek: z.number(),
  currentWeightKg: z.number(),
  goalWeightKg: z.number(),
  heightCm: z.number(),
  age: z.number(),
  gender: z.string(),
  focusAreas: z.array(z.string()),
});

const Input = z.object({
  front: z.string(),
  side: z.string().optional(),
  back: z.string().optional(),
  profile: ProfileSlim.passthrough(),
});

const ScoreField = z.number().min(0).max(100);
const ScanSchema = z.object({
  overallScore: ScoreField,
  scores: z.object({
    posture: ScoreField,
    symmetry: ScoreField,
    proportions: ScoreField,
    definition: ScoreField,
    conditioning: ScoreField,
    upperBody: ScoreField,
    lowerBody: ScoreField,
    core: ScoreField,
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  trainingFocus: z.array(z.string()),
  nutritionFocus: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

function buildPrompt(profile: z.infer<typeof ProfileSlim>) {
  return [
    "You are an experienced strength coach giving a VISUAL physique assessment from photos.",
    "DO NOT give medical advice. Do not state exact body-fat percentage.",
    "Look carefully at the images: posture, shoulder/hip alignment, left-right symmetry,",
    "waist-to-shoulder ratio, visible muscle definition, and overall conditioning.",
    "",
    "Scoring rules — IMPORTANT:",
    "- Use the FULL 0-100 range. Untrained / out-of-shape physiques should score 20-45.",
    "- Average recreational lifters: 45-65. Strong / athletic: 65-80. Elite / advanced: 80-95.",
    "- Vary scores between categories — do NOT default every field to ~70.",
    "- Each of the 8 scores must independently reflect what you actually see in the photos.",
    "",
    `User goal: ${profile.goal}. Experience: ${profile.experience}. Age: ${profile.age}. Gender: ${profile.gender}.`,
    `Height: ${profile.heightCm} cm. Weight: ${profile.currentWeightKg} kg. Goal weight: ${profile.goalWeightKg} kg.`,
    `Training: ${profile.daysPerWeek} days/week. Focus: ${profile.focusAreas.join(", ") || "balanced"}.`,
    "",
    "Provide 3-5 short bullet items in each list. Be specific to what you SEE.",
    "Tailor training and nutrition focus to the user's stated goal. No emojis.",
  ].join("\n");
}

function saltFromImage(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}


export const analyzeBodyScan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<BodyScanResult> => {
    const profile = data.profile as unknown as Profile;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return mockScanFor(profile);
    }

    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);

      const content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [
        { type: "text", text: buildPrompt(data.profile) },
        { type: "image_url", image_url: { url: data.front } },
      ];
      if (data.side) content.push({ type: "image_url", image_url: { url: data.side } });
      if (data.back) content.push({ type: "image_url", image_url: { url: data.back } });

      const { experimental_output: output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: ScanSchema }),
        messages: [{ role: "user", content: content as never }],
      });

      const overall = Math.round(output.overallScore);
      return {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        source: "ai",
        overallScore: overall,
        level: levelFor(overall),
        scores: output.scores,
        summary: output.summary,
        strengths: output.strengths.slice(0, 5),
        improvements: output.improvements.slice(0, 5),
        trainingFocus: output.trainingFocus.slice(0, 5),
        nutritionFocus: output.nutritionFocus.slice(0, 5),
        confidence: output.confidence,
        disclaimer: SCAN_DISCLAIMER,
      };
    } catch (err) {
      console.error("analyzeBodyScan failed, falling back to mock:", err);
      return mockScanFor(profile);
    }
  });
