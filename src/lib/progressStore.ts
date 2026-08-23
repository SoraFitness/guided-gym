import { useSyncExternalStore } from "react";
import { createClientId } from "./clientId";

export interface WorkoutLogEntry {
  id: string;
  date: string; // ISO
  minutes: number;
  workoutId?: string;
}

const KEY = "fitness:workoutLog";
const EVT = "fitness:progress-change";

let cache: WorkoutLogEntry[] | null = null;
function loadFresh(): WorkoutLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function load(): WorkoutLogEntry[] {
  if (cache === null) cache = loadFresh();
  return cache;
}
function save(list: WorkoutLogEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  cache = list;
  window.dispatchEvent(new Event(EVT));
}

export function logWorkout(minutes: number, workoutId?: string) {
  const list = [...load()];
  list.push({ id: createClientId(), date: new Date().toISOString(), minutes, workoutId });
  save(list);
}

// Snapshot + bulk replace (used by cloud sync).
export function getWorkoutLogEntries(): WorkoutLogEntry[] {
  return load();
}
export function replaceWorkoutLogEntries(list: WorkoutLogEntry[]) {
  save(list);
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    cache = null;
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) invalidate();
  };
  window.addEventListener(EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}
const empty: WorkoutLogEntry[] = [];

export function useWorkoutLog(): WorkoutLogEntry[] {
  return useSyncExternalStore(subscribe, load, () => empty);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

export interface ProgressSummary {
  workoutMinutesToday: number;
  workoutMinutesTarget: number;
  completedThisWeek: number;
  streakDays: number;
}

export function useProgress(workoutMinutesTarget = 30): ProgressSummary {
  const log = useWorkoutLog();
  const today = new Date().toDateString();
  const workoutMinutesToday = log
    .filter((l) => new Date(l.date).toDateString() === today)
    .reduce((s, l) => s + l.minutes, 0);

  const weekStart = startOfWeek(new Date()).getTime();
  const completedThisWeek = new Set(
    log
      .filter((l) => new Date(l.date).getTime() >= weekStart)
      .map((l) => new Date(l.date).toDateString()),
  ).size;

  // streak: consecutive prior days (incl. today) with at least one workout
  const days = new Set(log.map((l) => new Date(l.date).toDateString()));
  let streakDays = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { workoutMinutesToday, workoutMinutesTarget, completedThisWeek, streakDays };
}
