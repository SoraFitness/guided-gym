import { useSyncExternalStore } from "react";
import type { BodyScanResult } from "./bodyScan";

const KEY = "fitness:bodyScans";
const EVT = "fitness:bodyScans-change";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

function read(): BodyScanResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as BodyScanResult[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function write(list: BodyScanResult[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  emit();
}

export function saveScan(scan: BodyScanResult) {
  const list = read();
  list.unshift(scan);
  write(list.slice(0, 30));
}
export function deleteScan(id: string) {
  write(read().filter((s) => s.id !== id));
}
export function getScan(id: string): BodyScanResult | null {
  return read().find((s) => s.id === id) ?? null;
}
export function previousScan(id: string): BodyScanResult | null {
  const list = read();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0 || idx === list.length - 1) return null;
  return list[idx + 1] ?? null;
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) cb();
  };
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
const empty: BodyScanResult[] = [];

export function useScans(): BodyScanResult[] {
  return useSyncExternalStore(subscribe, read, () => empty);
}
export function useLatestScan(): BodyScanResult | null {
  const list = useScans();
  return list[0] ?? null;
}

// Downscale a data URL image to a small thumbnail to keep localStorage tiny
export async function makeThumbnail(dataUrl: string, max = 480): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
