// Weight log + adaptive maintenance recalibration.
// Local-only, reactive store.

import { useSyncExternalStore } from "react";
import type { PlanResult } from "./calorieEngine";
import { KCAL_PER_KG_FAT } from "./calorieEngine";

export interface WeightEntry {
  id: string;
  kg: number;
  date: string; // ISO
}

const KEY = "fitness:weightlog";
const EVT = "fitness:weightlog-change";

function read(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch {
    return [];
  }
}
function write(list: WeightEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

let cache: WeightEntry[] | null = null;
function emit() {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => { cache = null; cb(); };
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === KEY) invalidate(); };
  window.addEventListener(EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnap = () => (cache ??= read().sort((a, b) => a.date.localeCompare(b.date)));
const empty: WeightEntry[] = [];

export function useWeightLog(): WeightEntry[] {
  return useSyncExternalStore(subscribe, getSnap, () => empty);
}

export function logWeight(kg: number, date: Date = new Date()) {
  const list = read();
  const isoDay = date.toISOString().slice(0, 10);
  // Replace any existing entry for the same day
  const filtered = list.filter((e) => e.date.slice(0, 10) !== isoDay);
  filtered.push({ id: crypto.randomUUID(), kg, date: date.toISOString() });
  write(filtered);
  emit();
}

export function removeWeightEntry(id: string) {
  write(read().filter((e) => e.id !== id));
  emit();
}

// Bulk replace (used by cloud sync hydration).
export function replaceWeightLog(list: WeightEntry[]) {
  write(list);
  emit();
}

export function getWeightLogEntries(): WeightEntry[] {
  return read();
}

export function getLatestWeight(): WeightEntry | null {
  const list = read().sort((a, b) => a.date.localeCompare(b.date));
  return list[list.length - 1] ?? null;
}

// ---------- Adaptive recalibration ----------

export interface DailyIntake {
  date: string; // YYYY-MM-DD
  kcal: number;
}

export interface RecalibrationResult {
  enoughData: boolean;
  daysOfData: number;
  observedMaintenanceKcal?: number;
  blendedMaintenanceKcal?: number;
  observedWeeklyChangeKg?: number;
  avgDailyIntake?: number;
  confidence: "none" | "low" | "medium" | "high";
  suggestion: string;
}

/**
 * Estimate true maintenance from observed weight change vs. logged intake.
 * Needs ≥ 7 days of weight + intake data. Blends with formula TDEE as more data arrives.
 */
export function recalibrateMaintenance(
  weights: WeightEntry[],
  intakeByDay: DailyIntake[],
  currentPlan: PlanResult,
): RecalibrationResult {
  const sortedW = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  if (sortedW.length < 2) {
    return {
      enoughData: false,
      daysOfData: sortedW.length,
      confidence: "none",
      suggestion: "Log your weight a few times this week so we can fine-tune your maintenance estimate.",
    };
  }

  const first = sortedW[0];
  const last = sortedW[sortedW.length - 1];
  const spanDays = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000);

  if (spanDays < 7) {
    return {
      enoughData: false,
      daysOfData: Math.round(spanDays),
      confidence: "none",
      suggestion: `Log weight for at least 7 days (you have ${Math.round(spanDays)}) to unlock smart maintenance adjustments.`,
    };
  }

  // Average daily intake within the same window
  const firstDay = first.date.slice(0, 10);
  const lastDay = last.date.slice(0, 10);
  const inWindow = intakeByDay.filter((d) => d.date >= firstDay && d.date <= lastDay && d.kcal > 0);

  if (inWindow.length < 7) {
    return {
      enoughData: false,
      daysOfData: inWindow.length,
      confidence: "low",
      suggestion: `Log your food for at least 7 days (you have ${inWindow.length}) to enable smart calorie adjustments.`,
    };
  }

  const avgIntake = inWindow.reduce((s, d) => s + d.kcal, 0) / inWindow.length;
  const weightChangeKg = last.kg - first.kg; // positive = gained
  const dailyEnergyBalance = (weightChangeKg * KCAL_PER_KG_FAT) / spanDays; // +ve if surplus
  // observedMaintenance = avg intake - daily energy stored
  const observedMaintenance = avgIntake - dailyEnergyBalance;

  // Blend with formula maintenance: more weight on observed as data grows.
  // 7 days → 50/50, 14 days → 70/30, 28+ days → 90/10 observed.
  const w = Math.min(0.9, 0.3 + (spanDays / 28) * 0.6);
  const blended = w * observedMaintenance + (1 - w) * currentPlan.formulaMaintenanceKcal;

  const weeklyChangeKg = (weightChangeKg / spanDays) * 7;

  let confidence: RecalibrationResult["confidence"] = "low";
  if (spanDays >= 21) confidence = "high";
  else if (spanDays >= 14) confidence = "medium";

  let suggestion = "";
  const diffFromFormula = blended - currentPlan.formulaMaintenanceKcal;
  if (Math.abs(diffFromFormula) < 80) {
    suggestion = "Your actual maintenance is close to the formula estimate — keep going.";
  } else if (diffFromFormula < 0) {
    suggestion = `Your true maintenance looks ~${Math.round(-diffFromFormula)} kcal lower than the formula. Consider lowering intake or adding steps.`;
  } else {
    suggestion = `Your true maintenance looks ~${Math.round(diffFromFormula)} kcal higher than the formula. You can likely eat more without slowing progress.`;
  }

  // Goal-specific guidance
  if (currentPlan.effectiveGoal === "lose") {
    if (weeklyChangeKg >= 0) {
      suggestion += " You're not losing yet — reduce intake by 100–200 kcal/day or add cardio.";
    } else if (weeklyChangeKg < -1) {
      suggestion += " You're losing very fast — add ~150 kcal/day to protect muscle.";
    }
  } else if (currentPlan.effectiveGoal === "gain") {
    if (weeklyChangeKg <= 0) {
      suggestion += " You're not gaining — bump intake by 150–250 kcal/day.";
    }
  }

  return {
    enoughData: true,
    daysOfData: Math.round(spanDays),
    observedMaintenanceKcal: Math.round(observedMaintenance),
    blendedMaintenanceKcal: Math.round(blended),
    observedWeeklyChangeKg: weeklyChangeKg,
    avgDailyIntake: Math.round(avgIntake),
    confidence,
    suggestion,
  };
}
