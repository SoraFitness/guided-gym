import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompress";
import { imageDataUrlToBlob } from "@/lib/imageDataUrl";
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
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      try {
        return crypto.randomUUID();
      } catch {
        // Some mobile browsers expose randomUUID but block it on a LAN HTTP origin.
      }
    }

    // getRandomValues remains available on mobile HTTP origins even when randomUUID is not.
    // Set the RFC 4122 version/variant bits so Supabase accepts the value as a UUID column.
    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }

  throw new Error("This browser cannot securely prepare the scan. Try a modern browser.");
}

async function dataUrlToJpeg(dataUrl: string): Promise<Blob> {
  const original = imageDataUrlToBlob(dataUrl);
  const file = new File([original], "scan-photo", { type: original.type || "image/jpeg" });
  return compressImage(file, 1800, 0.88);
}

async function uploadScanPhoto(path: string, blob: Blob) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { error } = await supabase.storage.from("progress-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (!error) return;
      lastError = new Error(error.message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Upload failed");
    }

    if (attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  console.error("[scan-submissions] Photo upload failed", lastError);
  throw new Error("Couldn't upload your photo. Check your connection and try again.");
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
      await uploadScanPhoto(path, blob);
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
