// Internal marketing Body Scan.
//
// Same analysis members get, but for scanning other people: nothing is written
// to the operator's scan history, no weekly quota is consumed, and the photo is
// never uploaded to storage. Restricted to the staff email allowlist.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminEmail } from "@/lib/adminAccess.server";
import { analyzeBodyPhotoStandalone, type BodyScanAiResult } from "@/lib/bodyScan.functions";
import { analyzeFacePhotoStandalone, type FaceScanResult } from "@/lib/faceScan.functions";
import { claimRateLimit } from "@/lib/rateLimit.server";

const MarketingScanInput = z.object({
  photo: z
    .string()
    .max(3_500_000)
    .refine((value) => /^data:image\/(?:jpeg|png|webp);base64,/i.test(value), {
      message: "Use a JPEG, PNG, or WebP photo.",
    }),
  // Sex of the person being scanned. Body-fat scales differ by roughly 8-10
  // points between sexes, so without it the range cannot be calibrated.
  sex: z.enum(["male", "female"]).optional(),
});

export const analyzeMarketingBodyScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(MarketingScanInput)
  .handler(async ({ data, context }): Promise<BodyScanAiResult> => {
    requireAdminEmail((context.claims as { email?: unknown } | undefined)?.email);

    claimRateLimit("marketing-body-scan", {
      limit: 40,
      windowMs: 60 * 60 * 1_000,
      identity: context.userId,
    });

    return analyzeBodyPhotoStandalone({
      photo: data.photo,
      accessToken: context.accessToken,
      sex: data.sex,
    });
  });

export const analyzeMarketingFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(MarketingScanInput)
  .handler(async ({ data, context }): Promise<FaceScanResult> => {
    requireAdminEmail((context.claims as { email?: unknown } | undefined)?.email);

    claimRateLimit("marketing-face-scan", {
      limit: 40,
      windowMs: 60 * 60 * 1_000,
      identity: context.userId,
    });

    return analyzeFacePhotoStandalone({ photo: data.photo, accessToken: context.accessToken });
  });
