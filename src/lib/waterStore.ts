// Daily water log and the suggested intake. Local-first, reactive store that cloud
// sync carries in user_app_state alongside the other small per-member lists.

import { useSyncExternalStore } from "react";
import { createClientId } from "./clientId";
import type { Profile } from "./profile";

export interface WaterEntry {
  id: string;
  ml: number;
  loggedAt: string; // ISO
}

const KEY = "fitness:waterlog";
export const WATER_CHANGE_EVT = "fitness:water-change";
const KEEP_DAYS = 120;
const ML_PER_OZ = 29.5735;

// About what EFSA and the US National Academies suggest from drinks for most adults,
// scaled to body size, plus sweat lost in training (~0.7 L/hour) averaged over the week.
const ML_PER_KG = 33;
const ML_PER_TRAINING_MINUTE = 12;
const MIN_GOAL_ML = 1500;
const MAX_GOAL_ML = 5000;

export function waterGoalMl(
  profile: Pick<Profile, "currentWeightKg" | "daysPerWeek" | "sessionMinutes">,
) {
  const base = profile.currentWeightKg * ML_PER_KG;
  const training = (profile.daysPerWeek * profile.sessionMinutes * ML_PER_TRAINING_MINUTE) / 7;
  const goal = Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, base + training));
  return Math.round(goal / 50) * 50;
}

/** One-tap amounts for the member's units, in ml. */
export function waterQuickAddsMl(units: Profile["units"]) {
  return units === "imperial" ? [8, 16, 24].map((oz) => oz * ML_PER_OZ) : [250, 500, 750];
}

export const ozToMl = (oz: number) => oz * ML_PER_OZ;

export function formatWater(ml: number, units: Profile["units"]) {
  if (units === "imperial") return `${Math.round(ml / ML_PER_OZ)} oz`;
  return ml >= 1000 ? `${Number((ml / 1000).toFixed(2))} L` : `${Math.round(ml)} ml`;
}

function read(): WaterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as WaterEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: WaterEntry[]) {
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  localStorage.setItem(
    KEY,
    JSON.stringify(list.filter((entry) => new Date(entry.loggedAt).getTime() >= cutoff)),
  );
}

let cache: WaterEntry[] | null = null;

function emit() {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WATER_CHANGE_EVT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    cache = null;
    callback();
  };
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === KEY) invalidate();
  };
  window.addEventListener(WATER_CHANGE_EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WATER_CHANGE_EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}

const empty: WaterEntry[] = [];

export function useWaterLog(): WaterEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => (cache ??= read()),
    () => empty,
  );
}

export function waterOn(entries: WaterEntry[], date: Date): WaterEntry[] {
  const day = date.toDateString();
  return entries.filter((entry) => new Date(entry.loggedAt).toDateString() === day);
}

export function waterTotalMl(entries: WaterEntry[]) {
  return entries.reduce((total, entry) => total + entry.ml, 0);
}

export function addWater(ml: number, date: Date = new Date()) {
  write([...read(), { id: createClientId(), ml, loggedAt: date.toISOString() }]);
  emit();
}

export function removeWater(id: string) {
  write(read().filter((entry) => entry.id !== id));
  emit();
}

// Bulk replace (used by cloud sync hydration).
export function replaceWaterLog(list: WaterEntry[]) {
  write(list);
  emit();
}

export function getWaterLogEntries(): WaterEntry[] {
  return read();
}
