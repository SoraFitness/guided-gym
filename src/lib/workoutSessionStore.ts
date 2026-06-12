import { useSyncExternalStore } from "react";

export interface WorkoutSession {
  id: string;
  workoutId: string;
  startedAt: string;
  completedAt?: string;
  currentExerciseIndex: number;
  /** Map of exerciseId -> sets completed */
  completedSets: Record<string, number>;
  status: "active" | "completed" | "abandoned";
}

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutTitle: string;
  completedAt: string;
  durationMin: number;
  calories: number;
  exercisesCompleted: number;
}

const SESSION_KEY = "fitness:activeSession";
const COMPLETED_KEY = "fitness:completedWorkouts";
const EVT = "fitness:session-change";

/* -------- active session -------- */
let sessionCache: WorkoutSession | null | undefined = undefined;
function readSession(): WorkoutSession | null {
  if (typeof window === "undefined") return null;
  if (sessionCache !== undefined) return sessionCache;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    sessionCache = raw ? (JSON.parse(raw) as WorkoutSession) : null;
  } catch {
    sessionCache = null;
  }
  return sessionCache;
}
function writeSession(s: WorkoutSession | null) {
  sessionCache = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    sessionCache = undefined;
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SESSION_KEY) invalidate();
  };
  window.addEventListener(EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}

export function useActiveSession(): WorkoutSession | null {
  return useSyncExternalStore(subscribe, readSession, () => null);
}

export function startSession(workoutId: string): WorkoutSession {
  const existing = readSession();
  if (existing && existing.workoutId === workoutId && existing.status === "active") {
    return existing;
  }
  const next: WorkoutSession = {
    id: crypto.randomUUID(),
    workoutId,
    startedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    completedSets: {},
    status: "active",
  };
  writeSession(next);
  return next;
}

export function updateSession(patch: Partial<WorkoutSession>) {
  const cur = readSession();
  if (!cur) return;
  writeSession({ ...cur, ...patch });
}

export function incrementSet(exerciseId: string) {
  const cur = readSession();
  if (!cur) return;
  const next = { ...cur };
  next.completedSets = {
    ...cur.completedSets,
    [exerciseId]: (cur.completedSets[exerciseId] ?? 0) + 1,
  };
  writeSession(next);
}

export function clearSession() {
  writeSession(null);
}

/* -------- completed workouts -------- */
function readCompleted(): CompletedWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveCompletedWorkout(c: CompletedWorkout) {
  const list = [...readCompleted(), c];
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
}
export function getCompletedWorkouts(): CompletedWorkout[] {
  return readCompleted();
}
