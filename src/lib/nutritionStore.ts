import { useEffect, useSyncExternalStore } from "react";
import {
  loadLog, saveLog, loadGoals, saveGoals as saveGoalsRaw,
  entriesOn, macrosFor,
  type LogEntry, type NutritionGoals,
} from "./foods";

const EVT = "fitness:nutrition-change";

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === "fitness:foodlog" || e.key === "fitness:goals") cb();
  };
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getEntriesSnap = () => loadLog();
const getGoalsSnap = () => loadGoals();
const empty: LogEntry[] = [];
const emptyGoals: NutritionGoals = { kcal: 2100, protein: 140, carbs: 230, fat: 70 };

export function setNutritionGoals(g: NutritionGoals) {
  saveGoalsRaw(g);
  emit();
}

export function addEntry(entry: Omit<LogEntry, "id" | "loggedAt"> & { loggedAt?: string }) {
  const list = loadLog();
  list.push({
    id: crypto.randomUUID(),
    loggedAt: entry.loggedAt ?? new Date().toISOString(),
    meal: entry.meal,
    servings: entry.servings,
    foodId: entry.foodId,
    custom: entry.custom,
  });
  saveLog(list);
  emit();
}
export function updateEntry(id: string, patch: Partial<LogEntry>) {
  const list = loadLog().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveLog(list);
  emit();
}
export function removeEntry(id: string) {
  saveLog(loadLog().filter((e) => e.id !== id));
  emit();
}
export function replaceEntries(next: LogEntry[]) {
  saveLog(next);
  emit();
}

export function useEntries(): LogEntry[] {
  return useSyncExternalStore(subscribe, getEntriesSnap, () => empty);
}
export function useGoals(): NutritionGoals {
  return useSyncExternalStore(subscribe, getGoalsSnap, () => emptyGoals);
}

export interface DailyNutritionTotals {
  kcal: number; protein: number; carbs: number; fat: number;
  remaining: number;
  progress: { kcal: number; protein: number; carbs: number; fat: number };
  itemCount: number;
}

export function useNutrition(date: Date = new Date()) {
  const entries = useEntries();
  const goals = useGoals();
  const today = entriesOn(entries, date);
  const m = macrosFor(today);
  const totals: DailyNutritionTotals = {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
    remaining: Math.max(0, goals.kcal - Math.round(m.kcal)),
    progress: {
      kcal: goals.kcal ? Math.min(1, m.kcal / goals.kcal) : 0,
      protein: goals.protein ? Math.min(1, m.protein / goals.protein) : 0,
      carbs: goals.carbs ? Math.min(1, m.carbs / goals.carbs) : 0,
      fat: goals.fat ? Math.min(1, m.fat / goals.fat) : 0,
    },
    itemCount: today.length,
  };
  return { entries, todayEntries: today, goals, totals };
}

// Helper: trigger refresh when a different tab/screen mutated storage directly.
export function useNutritionRefresh() {
  useEffect(() => {
    const cb = () => emit();
    window.addEventListener("focus", cb);
    return () => window.removeEventListener("focus", cb);
  }, []);
}
