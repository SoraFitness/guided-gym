import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";
import { createAscendrAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { claimRateLimit } from "@/lib/rateLimit.server";
import { generateText } from "ai";

const BUCKET = "progress-photos";
const SIGNED_TTL = 60 * 60; // 1 hour

export type PhotoType = "front" | "side" | "back" | "custom";

export interface ProgressPhotoRow {
  id: string;
  image_path: string;
  signed_url: string;
  photo_type: PhotoType;
  weight_kg: number | null;
  taken_on: string; // ISO date
  notes: string | null;
  created_at: string;
}

const photoTypeSchema = z.enum(["front", "side", "back", "custom"]);

const updateInput = z.object({
  id: z.string().uuid(),
  photo_type: photoTypeSchema.optional(),
  weight_kg: z.number().nullable().optional(),
  taken_on: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const createInput = z.object({
  image_path: z.string().min(1),
  photo_type: photoTypeSchema,
  weight_kg: z.number().nullable().optional(),
  taken_on: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export const listProgressPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .handler(async ({ context }): Promise<ProgressPhotoRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("progress_photos")
      .select("id, image_path, photo_type, weight_kg, taken_on, notes, created_at")
      .eq("user_id", userId)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const paths = rows.map((r) => r.image_path as string);
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_TTL);
    if (signErr) throw new Error(signErr.message);
    const signedMap = new Map<string, string>();
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    });

    return rows.map((r) => ({
      id: r.id as string,
      image_path: r.image_path as string,
      signed_url: signedMap.get(r.image_path as string) ?? "",
      photo_type: r.photo_type as PhotoType,
      weight_kg: r.weight_kg === null ? null : Number(r.weight_kg),
      taken_on: r.taken_on as string,
      notes: (r.notes as string | null) ?? null,
      created_at: r.created_at as string,
    }));
  });

export const getProgressPhoto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ProgressPhotoRow | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("progress_photos")
      .select("id, image_path, photo_type, weight_kg, taken_on, notes, created_at")
      .eq("user_id", userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.image_path as string, SIGNED_TTL);
    return {
      id: row.id as string,
      image_path: row.image_path as string,
      signed_url: signed?.signedUrl ?? "",
      photo_type: row.photo_type as PhotoType,
      weight_kg: row.weight_kg === null ? null : Number(row.weight_kg),
      taken_on: row.taken_on as string,
      notes: (row.notes as string | null) ?? null,
      created_at: row.created_at as string,
    };
  });

export const createProgressPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Defense in depth: ensure the path starts with userId/
    if (!data.image_path.startsWith(`${userId}/`)) {
      throw new Error("Invalid image path");
    }
    const { data: row, error } = await supabase
      .from("progress_photos")
      .insert({
        user_id: userId,
        image_path: data.image_path,
        photo_type: data.photo_type,
        weight_kg: data.weight_kg ?? null,
        taken_on: data.taken_on,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to save");
    return { id: row.id as string };
  });

export const updateProgressPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: {
      photo_type?: PhotoType;
      weight_kg?: number | null;
      taken_on?: string;
      notes?: string | null;
    } = {};
    if (data.photo_type !== undefined) patch.photo_type = data.photo_type;
    if (data.weight_kg !== undefined) patch.weight_kg = data.weight_kg;
    if (data.taken_on !== undefined) patch.taken_on = data.taken_on;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabase
      .from("progress_photos")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProgressPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: rErr } = await supabase
      .from("progress_photos")
      .select("image_path")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) return { ok: true };
    const { error } = await supabase
      .from("progress_photos")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    await supabase.storage.from(BUCKET).remove([row.image_path as string]);
    return { ok: true };
  });

interface AiFeedback {
  summary: string;
  observations: string[];
  tips: string[];
}

export const compareProgressPhotosAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: { beforeId: string; afterId: string }) =>
    z.object({ beforeId: z.string().uuid(), afterId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<AiFeedback> => {
    const { supabase, userId } = context;
    claimRateLimit("progress-photo-compare", {
      limit: 8,
      windowMs: 60 * 60 * 1_000,
      identity: userId,
    });
    const { data: rows, error } = await supabase
      .from("progress_photos")
      .select("id, image_path, weight_kg, taken_on, photo_type")
      .eq("user_id", userId)
      .in("id", [data.beforeId, data.afterId]);
    if (error) throw new Error(error.message);
    const before = rows?.find((r) => r.id === data.beforeId);
    const after = rows?.find((r) => r.id === data.afterId);
    if (!before || !after) throw new Error("Photos not found");

    const { data: signed, error: sErr } = await supabase.storage
      .from("progress-photos")
      .createSignedUrls([before.image_path as string, after.image_path as string], 60 * 10);
    if (sErr) throw new Error(sErr.message);
    const beforeUrl = signed?.find((s) => s.path === before.image_path)?.signedUrl;
    const afterUrl = signed?.find((s) => s.path === after.image_path)?.signedUrl;
    if (!beforeUrl || !afterUrl) throw new Error("Could not load images");

    const gateway = createAscendrAiGatewayProvider(context.accessToken, "progress-photo-compare");
    const model = gateway("google/gemini-2.5-flash");

    const beforeDate = new Date(before.taken_on as string);
    const afterDate = new Date(after.taken_on as string);
    const days = Math.max(0, Math.round((afterDate.getTime() - beforeDate.getTime()) / 86400000));
    const wb = before.weight_kg !== null ? Number(before.weight_kg) : null;
    const wa = after.weight_kg !== null ? Number(after.weight_kg) : null;
    const weightDiff = wb !== null && wa !== null ? +(wa - wb).toFixed(1) : null;

    const system = `You are a friendly, encouraging fitness coach reviewing two progress photos a user took of themselves.

RULES — non-negotiable:
- NEVER make medical claims, diagnose conditions, or estimate body-fat percentages with false precision.
- NEVER shame the user, comment on attractiveness, or use harsh language.
- NEVER claim certainty about changes that could be lighting/pose artifacts.
- Be realistic, kind, specific, and motivating.
- Mention lighting/angle consistency tips when relevant.
- If the two photos look essentially identical, say so kindly and encourage patience.

Return strict JSON only, no prose around it, in this shape:
{
  "summary": "1-2 sentences, warm, honest",
  "observations": ["3-5 short specific visual observations"],
  "tips": ["1-3 short tips for better future comparisons or training"]
}`;

    const user = `Compare these two progress photos.

BEFORE — taken ${before.taken_on}, type: ${before.photo_type}${wb !== null ? `, weight: ${wb}kg` : ""}
AFTER  — taken ${after.taken_on}, type: ${after.photo_type}${wa !== null ? `, weight: ${wa}kg` : ""}
Elapsed: ${days} day(s)${weightDiff !== null ? `, weight change: ${weightDiff > 0 ? "+" : ""}${weightDiff}kg` : ""}

Reply with the JSON object only.`;

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image", image: new URL(beforeUrl) },
            { type: "image", image: new URL(afterUrl) },
          ],
        },
      ],
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : text;
    try {
      const parsed = JSON.parse(raw) as Partial<AiFeedback>;
      return {
        summary: String(parsed.summary ?? "Here's what I noticed."),
        observations: Array.isArray(parsed.observations)
          ? parsed.observations.slice(0, 5).map(String)
          : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map(String) : [],
      };
    } catch {
      return {
        summary: text.slice(0, 300),
        observations: [],
        tips: ["For sharper comparisons, take photos in similar lighting and pose."],
      };
    }
  });
