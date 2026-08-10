import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SCAN_WEEKLY_LIMIT = 5;
export type ScanQuotaType = "face" | "body";

export interface ScanQuotaStatus {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
  resetsAt: string;
}

const scanTypeSchema = z.enum(["face", "body"]);
const quotaRowSchema = z.object({
  allowed: z.boolean(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  limit_count: z.number().int().positive(),
  resets_at: z.string().min(1),
});

function parseQuota(data: unknown): ScanQuotaStatus {
  const row = quotaRowSchema.parse(Array.isArray(data) ? data[0] : data);
  return {
    allowed: row.allowed,
    used: row.used,
    remaining: row.remaining,
    limit: row.limit_count,
    resetsAt: row.resets_at,
  };
}

function scanLabel(scanType: ScanQuotaType) {
  return scanType === "face" ? "Face Scan" : "Body Scan";
}

export function quotaLimitMessage(scanType: ScanQuotaType) {
  return `You've reached this week's ${SCAN_WEEKLY_LIMIT} ${scanLabel(scanType)} limit. Your allowance resets Monday at 12:00 AM UTC.`;
}

export async function claimScanQuota(
  supabase: SupabaseClient<Database>,
  submissionId: string,
  scanType: ScanQuotaType,
) {
  const { data, error } = await supabase.rpc("claim_scan_quota", {
    p_submission_id: submissionId,
    p_scan_type: scanType,
  });

  if (error) throw new Error(error.message);
  const quota = parseQuota(data);
  if (!quota.allowed) throw new Error(quotaLimitMessage(scanType));
  return quota;
}

export const getScanQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ scanType: scanTypeSchema }).parse(data))
  .handler(async ({ data, context }): Promise<ScanQuotaStatus> => {
    const { data: quotaData, error } = await context.supabase.rpc("get_scan_quota", {
      p_scan_type: data.scanType,
    });

    if (error) throw new Error(error.message);
    return parseQuota(quotaData);
  });
