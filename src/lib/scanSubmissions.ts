import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompress";
import { createScanSubmission, updateScanSubmission } from "@/lib/scanSubmissions.functions";

export type ScanType = "face" | "body";
export type ScanStatus = "ready_for_analysis" | "processing" | "complete" | "failed";

interface SaveScanSubmissionInput {
  userId: string;
  scanType: ScanType;
  photos: Record<string, string | null | undefined>;
  goals?: string[];
  notes?: string | null;
  status?: ScanStatus;
}

function makeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("This browser cannot create a secure scan identifier.");
}

async function dataUrlToJpeg(dataUrl: string): Promise<Blob> {
  const original = await fetch(dataUrl).then((response) => response.blob());
  const file = new File([original], "scan-photo", { type: original.type || "image/jpeg" });
  return compressImage(file, 1800, 0.88);
}

export async function saveScanSubmission(input: SaveScanSubmissionInput) {
  const id = makeUuid();
  const uploadedPaths: string[] = [];
  const photoPaths: Record<string, string> = {};

  try {
    for (const [view, dataUrl] of Object.entries(input.photos)) {
      if (!dataUrl) continue;
      const path = `${input.userId}/scans/${input.scanType}/${id}/${view}.jpg`;
      const blob = await dataUrlToJpeg(dataUrl);
      const { error } = await supabase.storage.from("progress-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploadedPaths.push(path);
      photoPaths[view] = path;
    }

    await createScanSubmission({
      data: {
        id,
        scanType: input.scanType,
        status: input.status ?? "ready_for_analysis",
        photoPaths,
        goals: input.goals ?? [],
        notes: input.notes?.trim() || null,
      },
    });

    return { id, photoPaths };
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from("progress-photos").remove(uploadedPaths);
    }
    throw error;
  }
}

export async function setScanSubmissionStatus(id: string, status: ScanStatus, result?: unknown) {
  return updateScanSubmission({ data: { id, status, result } });
}
