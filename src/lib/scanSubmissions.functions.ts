import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscriptionMiddleware } from "@/lib/subscription-middleware";

const scanTypeSchema = z.enum(["face", "body"]);
const scanStatusSchema = z.enum(["ready_for_analysis", "processing", "complete", "failed"]);

const createInput = z.object({
  id: z.string().uuid(),
  scanType: scanTypeSchema,
  status: scanStatusSchema,
  photoPaths: z.record(z.string(), z.string().min(1)),
  goals: z.array(z.string().min(1).max(80)).max(8),
  notes: z.string().max(1000).nullable(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  status: scanStatusSchema,
  result: z.unknown().optional(),
});

const scanQueryInput = z.object({
  scanType: scanTypeSchema,
});

const scanDetailInput = z.object({
  id: z.string().uuid(),
  scanType: scanTypeSchema,
});

const deleteInput = z.object({
  id: z.string().uuid(),
});

export interface ScanSubmissionSummary {
  id: string;
  scanType: "face" | "body";
  status: "complete";
  createdAt: string;
  analyzedAt: string | null;
  overallScore: number;
  overallSummary: string;
  confidence: number | null;
  photoUrl: string | null;
}

export interface ScanSubmissionDetail extends ScanSubmissionSummary {
  analysis: Json;
}

function objectValue(value: Json | undefined): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringValue(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function toSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  row: { id: string; result: Json; created_at: string },
): Promise<ScanSubmissionDetail | null> {
  const submission = objectValue(row.result);
  if (!submission || submission.kind !== "scan_submission" || submission.status !== "complete") {
    return null;
  }

  const scanType = submission.scan_type;
  if (scanType !== "face" && scanType !== "body") return null;
  const analysis = objectValue(submission.analysis);
  const overallScore = numberValue(analysis?.overallScore);
  const overallSummary = stringValue(analysis?.overallSummary);
  if (!analysis || overallScore === null || !overallSummary) return null;

  const photoPaths = objectValue(submission.photo_paths);
  const photoPath = stringValue(photoPaths?.[scanType]);
  let photoUrl: string | null = null;
  if (photoPath?.startsWith(`${userId}/scans/${scanType}/`)) {
    const { data } = await supabase.storage
      .from("progress-photos")
      .createSignedUrl(photoPath, 60 * 30);
    photoUrl = data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    scanType,
    status: "complete",
    createdAt: stringValue(submission.created_at) ?? row.created_at,
    analyzedAt: stringValue(submission.analyzed_at),
    overallScore: Math.round(overallScore),
    overallSummary,
    confidence: numberValue(analysis.confidence),
    photoUrl,
    analysis,
  };
}

export const createScanSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const expectedPrefix = `${userId}/scans/${data.scanType}/${data.id}/`;
    const paths = Object.values(data.photoPaths);

    if (!paths.length || paths.some((path) => !path.startsWith(expectedPrefix))) {
      throw new Error("Invalid scan photo path");
    }

    const result: Json = {
      kind: "scan_submission",
      submission_id: data.id,
      scan_type: data.scanType,
      status: data.status,
      photo_paths: data.photoPaths,
      goals: data.goals,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("body_scans").insert({
      id: data.id,
      user_id: userId,
      result,
    });

    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const updateScanSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("body_scans")
      .select("result")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!row?.result || typeof row.result !== "object" || Array.isArray(row.result)) {
      throw new Error("Scan submission not found");
    }

    const existing = row.result as Record<string, Json | undefined>;
    if (existing.kind !== "scan_submission") throw new Error("Invalid scan submission");

    const next: Json = {
      ...existing,
      status: data.status,
      updated_at: new Date().toISOString(),
      ...(data.result !== undefined ? { analysis: data.result as Json } : {}),
    };

    const { error } = await context.supabase
      .from("body_scans")
      .update({ result: next })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listScanSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => scanQueryInput.parse(data))
  .handler(async ({ data, context }): Promise<ScanSubmissionSummary[]> => {
    const { data: rows, error } = await context.supabase
      .from("body_scans")
      .select("id,result,created_at")
      .eq("user_id", context.userId)
      .contains("result", {
        kind: "scan_submission",
        scan_type: data.scanType,
        status: "complete",
      })
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);
    const details = await Promise.all(
      (rows ?? []).map((row) => toSummary(context.supabase, context.userId, row)),
    );
    return details
      .filter(
        (item): item is ScanSubmissionDetail => item !== null && item.scanType === data.scanType,
      )
      .map(({ analysis: _analysis, ...summary }) => summary);
  });

export const getScanSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => scanDetailInput.parse(data))
  .handler(async ({ data, context }): Promise<ScanSubmissionDetail | null> => {
    const { data: row, error } = await context.supabase
      .from("body_scans")
      .select("id,result,created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return null;
    const detail = await toSummary(context.supabase, context.userId, row);
    return detail?.scanType === data.scanType ? detail : null;
  });

export const deleteScanSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireActiveSubscriptionMiddleware])
  .validator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error: readError } = await context.supabase
      .from("body_scans")
      .select("result")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!row) return { ok: true };

    const submission = objectValue(row.result);
    if (!submission || submission.kind !== "scan_submission") {
      throw new Error("Invalid scan submission");
    }

    const photoPaths = objectValue(submission.photo_paths);
    const ownedPaths = Object.values(photoPaths ?? {}).filter(
      (path): path is string => typeof path === "string" && path.startsWith(`${context.userId}/`),
    );
    if (ownedPaths.length) {
      const { error: storageError } = await context.supabase.storage
        .from("progress-photos")
        .remove(ownedPaths);
      if (storageError) throw new Error(storageError.message);
    }

    const { error } = await context.supabase
      .from("body_scans")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
