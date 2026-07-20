import { supabase } from "@/integrations/supabase/client";
import {
  createProgressPhoto,
  type PhotoType,
  type ProgressPhotoRow,
} from "@/lib/progressPhotos.functions";

const KEY = "fitness:guest-progress-photos";

interface LocalProgressPhoto {
  id: string;
  image_path: string;
  data_url: string;
  photo_type: PhotoType;
  weight_kg: number | null;
  taken_on: string;
  notes: string | null;
  created_at: string;
}

interface CreateLocalProgressPhotoInput {
  imageBlob: Blob;
  photo_type: PhotoType;
  weight_kg: number | null;
  taken_on: string;
  notes: string | null;
}

interface UpdateLocalProgressPhotoInput {
  id: string;
  photo_type?: PhotoType;
  weight_kg?: number | null;
  taken_on?: string;
  notes?: string | null;
}

function read(): LocalProgressPhoto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalProgressPhoto[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: LocalProgressPhoto[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function toRow(row: LocalProgressPhoto): ProgressPhotoRow {
  return {
    id: row.id,
    image_path: row.image_path,
    signed_url: row.data_url,
    photo_type: row.photo_type,
    weight_kg: row.weight_kg,
    taken_on: row.taken_on,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function sortRows(rows: ProgressPhotoRow[]): ProgressPhotoRow[] {
  return [...rows].sort((a, b) => {
    const byTaken = b.taken_on.localeCompare(a.taken_on);
    if (byTaken !== 0) return byTaken;
    return b.created_at.localeCompare(a.created_at);
  });
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

export function listLocalProgressPhotos(): ProgressPhotoRow[] {
  return sortRows(read().map(toRow));
}

export function getLocalProgressPhoto(id: string): ProgressPhotoRow | null {
  const row = read().find((item) => item.id === id);
  return row ? toRow(row) : null;
}

export async function createLocalProgressPhoto(input: CreateLocalProgressPhotoInput) {
  const id = makeId();
  const createdAt = new Date().toISOString();
  const dataUrl = await blobToDataUrl(input.imageBlob);
  const rows = read();
  const next: LocalProgressPhoto = {
    id,
    image_path: `local://${id}`,
    data_url: dataUrl,
    photo_type: input.photo_type,
    weight_kg: input.weight_kg,
    taken_on: input.taken_on,
    notes: input.notes,
    created_at: createdAt,
  };

  try {
    write([next, ...rows]);
  } catch (error) {
    throw new Error(
      "This photo is too large for guest device storage. Try a smaller image or save your account to use cloud storage.",
      { cause: error },
    );
  }

  return { id };
}

export function updateLocalProgressPhoto(input: UpdateLocalProgressPhotoInput) {
  const rows = read();
  const next = rows.map((row) =>
    row.id === input.id
      ? {
          ...row,
          photo_type: input.photo_type ?? row.photo_type,
          weight_kg: input.weight_kg !== undefined ? input.weight_kg : row.weight_kg,
          taken_on: input.taken_on ?? row.taken_on,
          notes: input.notes !== undefined ? input.notes : row.notes,
        }
      : row,
  );
  write(next);
  return { ok: true };
}

export function deleteLocalProgressPhoto(id: string) {
  write(read().filter((row) => row.id !== id));
  return { ok: true };
}

export async function syncLocalProgressPhotosToCloud(userId: string) {
  const rows = read();
  let synced = 0;

  for (const row of rows) {
    const blob = await fetch(row.data_url).then((response) => response.blob());
    const uuid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${userId}/${uuid}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    await createProgressPhoto({
      data: {
        image_path: path,
        photo_type: row.photo_type,
        taken_on: row.taken_on,
        weight_kg: row.weight_kg,
        notes: row.notes,
      },
    });

    write(read().filter((item) => item.id !== row.id));
    synced += 1;
  }

  return { synced };
}
