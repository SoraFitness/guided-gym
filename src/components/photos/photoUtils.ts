import type { PhotoType } from "@/lib/progressPhotos.functions";

export const PHOTO_TYPES: PhotoType[] = ["front", "side", "back", "custom"];

export function typeLabel(t: PhotoType): string {
  switch (t) {
    case "front":
      return "Front";
    case "side":
      return "Side";
    case "back":
      return "Back";
    case "custom":
      return "Other";
  }
}

export function formatPhotoDate(iso: string): string {
  // iso is YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  if (!y) return iso;
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  const a = new Date(ay, (am ?? 1) - 1, ad ?? 1).getTime();
  const b = new Date(by, (bm ?? 1) - 1, bd ?? 1).getTime();
  return Math.round((b - a) / 86400000);
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
