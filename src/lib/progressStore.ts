import { useSyncExternalStore } from "react";

export interface WorkoutLogEntry {
  id: string;
  date: string; // ISO
  minutes: number;
  workoutId?: string;
}

const KEY = "fitness:workoutLog";
const EVT = "fitness:progress-change";

function load(): WorkoutLogEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(list: WorkoutLogEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function logWorkout(minutes: number, workoutId?: string) {
  const list = load();
  list.push({ id: crypto.randomUUID(), date: new Date().toISOString(), minutes, workoutId });
  save(list);
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === KEY) cb(); };
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
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
    log.filter((l) => new Date(l.date).getTime() >= weekStart).map((l) => new Date(l.date).toDateString())
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
