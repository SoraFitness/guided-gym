import { useSyncExternalStore } from "react";
import { createClientId } from "./clientId";

export type WeightUnit = "lb" | "kg";

export interface SetLog {
  setNumber: number;
  plannedReps?: string;
  plannedDurationSec?: number;
  actualReps: number;
  actualDurationSec?: number;
  weight: number;
  unit: WeightUnit;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  isExtraSet: boolean;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  isBodyweight: boolean;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutTitle: string;
  startedAt: string;
  completedAt?: string;
  currentExerciseIndex: number;
  exercises: ExerciseLog[];
  unit: WeightUnit;
  notes?: string;
  status: "active" | "completed" | "abandoned";
}

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutTitle: string;
  startedAt: string;
  completedAt: string;
  durationMin: number;
  calories: number;
  unit: WeightUnit;
  exercises: ExerciseLog[];
  totalSets: number;
  totalReps: number;
  totalVolume: number; // in `unit`
  bestSet?: { exerciseName: string; weight: number; reps: number; unit: WeightUnit };
  notes?: string;
}

const SESSION_KEY = "fitness:activeSession:v2";
const COMPLETED_KEY = "fitness:completedWorkouts:v2";
const UNIT_KEY = "fitness:weightUnit";
const EVT = "fitness:session-change";
const HIST_EVT = "fitness:history-change";

/* -------- helpers -------- */

const BW_KEYWORDS = [
  "push-up",
  "pushup",
  "push up",
  "pull-up",
  "pullup",
  "pull up",
  "chin-up",
  "chinup",
  "dip",
  "sit-up",
  "situp",
  "crunch",
  "plank",
  "burpee",
  "mountain climber",
  "jumping jack",
  "lunge",
  "wall sit",
  "wall-sit",
  "hold",
  "bridge",
  "knee raise",
  "leg raise",
  "v-up",
  "vup",
  "high knee",
  "skater",
  "bear crawl",
  "inchworm",
  "superman",
  "donkey kick",
  "bird dog",
];
const WEIGHTED_KEYWORDS = [
  "dumbbell",
  "barbell",
  "kettlebell",
  "cable",
  "machine",
  "smith",
  "ez bar",
  "trap bar",
  "goblet",
];

export function isBodyweightExercise(name: string): boolean {
  const n = name.toLowerCase();
  if (WEIGHTED_KEYWORDS.some((k) => n.includes(k))) return false;
  if (BW_KEYWORDS.some((k) => n.includes(k))) return true;
  return false;
}

function parsePlannedReps(reps?: string): number {
  if (!reps) return 10;
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : 10;
}

export function parseDurationSeconds(time?: string): number | undefined {
  if (!time) return undefined;
  const match = time
    .trim()
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|m|sec|secs|second|seconds|s)\b/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * (match[2].startsWith("m") ? 60 : 1));
}

export function getPreferredUnit(): WeightUnit {
  if (typeof window === "undefined") return "lb";
  const v = localStorage.getItem(UNIT_KEY);
  return v === "kg" ? "kg" : "lb";
}
export function setPreferredUnit(u: WeightUnit) {
  if (typeof window === "undefined") return;
  localStorage.setItem(UNIT_KEY, u);
  window.dispatchEvent(new Event(EVT));
}

function makeEmptySet(
  setNumber: number,
  plannedReps: string | undefined,
  plannedDurationSec: number | undefined,
  unit: WeightUnit,
  isExtra: boolean,
): SetLog {
  return {
    setNumber,
    plannedReps,
    plannedDurationSec,
    actualReps: plannedDurationSec ? 0 : parsePlannedReps(plannedReps),
    weight: 0,
    unit,
    completed: false,
    isExtraSet: isExtra,
  };
}

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
  if (typeof window === "undefined") return;
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

export interface SeedExercise {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  time?: string;
  muscleGroup: string;
}

export function startSession(
  workoutId: string,
  workoutTitle?: string,
  exercises?: SeedExercise[],
): WorkoutSession {
  const existing = readSession();
  if (existing && existing.workoutId === workoutId && existing.status === "active") {
    return existing;
  }
  const unit = getPreferredUnit();
  const exLogs: ExerciseLog[] = (exercises ?? []).map((e) => ({
    id: createClientId(),
    exerciseId: e.id,
    exerciseName: e.name,
    muscleGroup: e.muscleGroup,
    isBodyweight: isBodyweightExercise(e.name),
    sets: Array.from({ length: Math.max(1, e.sets) }).map((_, i) =>
      makeEmptySet(i + 1, e.reps, parseDurationSeconds(e.time), unit, false),
    ),
  }));
  const next: WorkoutSession = {
    id: createClientId(),
    workoutId,
    workoutTitle: workoutTitle ?? "",
    startedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    exercises: exLogs,
    unit,
    status: "active",
  };
  writeSession(next);
  return next;
}

export function restartSession(
  workoutId: string,
  workoutTitle?: string,
  exercises?: SeedExercise[],
): WorkoutSession {
  writeSession(null);
  return startSession(workoutId, workoutTitle, exercises);
}

export function updateSession(patch: Partial<WorkoutSession>) {
  const cur = readSession();
  if (!cur) return;
  writeSession({ ...cur, ...patch });
}

export function addExerciseToSession(exercise: SeedExercise): ExerciseLog | null {
  const cur = readSession();
  if (!cur || cur.status !== "active") return null;
  const exerciseLog: ExerciseLog = {
    id: createClientId(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    isBodyweight: isBodyweightExercise(exercise.name),
    sets: Array.from({ length: Math.max(1, exercise.sets) }).map((_, index) =>
      makeEmptySet(index + 1, exercise.reps, parseDurationSeconds(exercise.time), cur.unit, false),
    ),
  };
  writeSession({ ...cur, exercises: [...cur.exercises, exerciseLog] });
  return exerciseLog;
}

export function updateSet(exerciseLogId: string, setNumber: number, patch: Partial<SetLog>) {
  const cur = readSession();
  if (!cur) return;
  writeSession({
    ...cur,
    exercises: cur.exercises.map((e) =>
      e.id !== exerciseLogId
        ? e
        : {
            ...e,
            sets: e.sets.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)),
          },
    ),
  });
}

export function completeSetInSession(exerciseLogId: string, setNumber: number) {
  updateSet(exerciseLogId, setNumber, {
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

export function addExtraSet(exerciseLogId: string) {
  const cur = readSession();
  if (!cur) return;
  writeSession({
    ...cur,
    exercises: cur.exercises.map((e) => {
      if (e.id !== exerciseLogId) return e;
      const lastSet = e.sets[e.sets.length - 1];
      const newSet = makeEmptySet(
        e.sets.length + 1,
        lastSet?.plannedReps,
        lastSet?.plannedDurationSec,
        cur.unit,
        true,
      );
      // copy last weight as a starting point
      if (lastSet) newSet.weight = lastSet.weight;
      return { ...e, sets: [...e.sets, newSet] };
    }),
  });
}

export function removeSet(exerciseLogId: string, setNumber: number) {
  const cur = readSession();
  if (!cur) return;
  writeSession({
    ...cur,
    exercises: cur.exercises.map((e) => {
      if (e.id !== exerciseLogId) return e;
      const filtered = e.sets.filter((s) => s.setNumber !== setNumber);
      // renumber
      return {
        ...e,
        sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })),
      };
    }),
  });
}

export function setExerciseNotes(exerciseLogId: string, notes: string) {
  const cur = readSession();
  if (!cur) return;
  writeSession({
    ...cur,
    exercises: cur.exercises.map((e) => (e.id !== exerciseLogId ? e : { ...e, notes })),
  });
}

export function setSessionUnit(unit: WeightUnit) {
  setPreferredUnit(unit);
  const cur = readSession();
  if (!cur) return;
  writeSession({
    ...cur,
    unit,
    exercises: cur.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => ({ ...s, unit })),
    })),
  });
}

export function clearSession() {
  writeSession(null);
}

/* -------- summary computation -------- */

export function computeSummary(s: { exercises: ExerciseLog[]; unit: WeightUnit }): {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  bestSet?: CompletedWorkout["bestSet"];
  exercisesCompleted: number;
} {
  let totalSets = 0,
    totalReps = 0,
    totalVolume = 0;
  let best: CompletedWorkout["bestSet"] | undefined;
  let exercisesCompleted = 0;
  for (const e of s.exercises) {
    const done = e.sets.filter((x) => x.completed);
    if (done.length) exercisesCompleted++;
    for (const set of done) {
      totalSets++;
      totalReps += set.actualReps;
      const vol = (set.weight || 0) * set.actualReps;
      totalVolume += vol;
      if (set.weight > 0) {
        if (!best || vol > best.weight * best.reps) {
          best = {
            exerciseName: e.exerciseName,
            weight: set.weight,
            reps: set.actualReps,
            unit: set.unit,
          };
        }
      }
    }
  }
  return { totalSets, totalReps, totalVolume, bestSet: best, exercisesCompleted };
}

/* -------- completed workouts -------- */
let historyCache: CompletedWorkout[] | null = null;
function readCompleted(): CompletedWorkout[] {
  if (typeof window === "undefined") return [];
  if (historyCache) return historyCache;
  try {
    historyCache = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
  } catch {
    historyCache = [];
  }
  return historyCache!;
}
function writeCompleted(list: CompletedWorkout[]) {
  historyCache = list;
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(HIST_EVT));
}

export function saveCompletedWorkout(c: CompletedWorkout) {
  const list = [c, ...readCompleted()];
  writeCompleted(list);
}

// Bulk replace (used by cloud sync hydration).
export function replaceCompletedWorkouts(list: CompletedWorkout[]) {
  writeCompleted(list);
}

export function getCompletedWorkouts(): CompletedWorkout[] {
  return readCompleted();
}

export function getCompletedWorkout(id: string): CompletedWorkout | undefined {
  return readCompleted().find((w) => w.id === id);
}

export function updateCompletedWorkout(id: string, patch: Partial<CompletedWorkout>) {
  const list = readCompleted().map((w) => {
    if (w.id !== id) return w;
    const merged = { ...w, ...patch };
    // recompute aggregates if exercises changed
    if (patch.exercises) {
      const sum = computeSummary({ exercises: merged.exercises, unit: merged.unit });
      merged.totalSets = sum.totalSets;
      merged.totalReps = sum.totalReps;
      merged.totalVolume = sum.totalVolume;
      merged.bestSet = sum.bestSet;
    }
    return merged;
  });
  writeCompleted(list);
}

export function deleteCompletedWorkout(id: string) {
  writeCompleted(readCompleted().filter((w) => w.id !== id));
}

function subscribeHistory(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    historyCache = null;
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === COMPLETED_KEY) invalidate();
  };
  window.addEventListener(HIST_EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HIST_EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}
const emptyHistory: CompletedWorkout[] = [];
export function useCompletedWorkouts(): CompletedWorkout[] {
  return useSyncExternalStore(subscribeHistory, readCompleted, () => emptyHistory);
}

/* -------- PRs -------- */

export interface PRSummary {
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // mixed-unit (treats lb & kg equally — display warns)
  bestVolumeWorkout?: { id: string; title: string; volume: number; unit: WeightUnit };
  maxWeightByExercise: Record<
    string,
    { weight: number; reps: number; unit: WeightUnit; date: string }
  >;
  maxRepsByExercise: Record<string, { reps: number; weight: number; date: string }>;
  best1RMByExercise: Record<
    string,
    { e1rm: number; weight: number; reps: number; unit: WeightUnit; date: string }
  >;
}

export function computePRs(history: CompletedWorkout[]): PRSummary {
  let totalSets = 0,
    totalReps = 0,
    totalVolume = 0;
  let bestVol: PRSummary["bestVolumeWorkout"] | undefined;
  const maxWeight: PRSummary["maxWeightByExercise"] = {};
  const maxReps: PRSummary["maxRepsByExercise"] = {};
  const best1RM: PRSummary["best1RMByExercise"] = {};

  for (const w of history) {
    totalSets += w.totalSets;
    totalReps += w.totalReps;
    totalVolume += w.totalVolume;
    if (!bestVol || w.totalVolume > bestVol.volume) {
      bestVol = { id: w.id, title: w.workoutTitle, volume: w.totalVolume, unit: w.unit };
    }
    for (const e of w.exercises) {
      for (const s of e.sets) {
        if (!s.completed) continue;
        const name = e.exerciseName;
        if (s.weight > 0) {
          const cur = maxWeight[name];
          if (!cur || s.weight > cur.weight) {
            maxWeight[name] = {
              weight: s.weight,
              reps: s.actualReps,
              unit: s.unit,
              date: w.completedAt,
            };
          }
          // Epley
          const e1rm = s.weight * (1 + s.actualReps / 30);
          const curRm = best1RM[name];
          if (!curRm || e1rm > curRm.e1rm) {
            best1RM[name] = {
              e1rm: Math.round(e1rm * 10) / 10,
              weight: s.weight,
              reps: s.actualReps,
              unit: s.unit,
              date: w.completedAt,
            };
          }
        }
        const curR = maxReps[name];
        if (!curR || s.actualReps > curR.reps) {
          maxReps[name] = {
            reps: s.actualReps,
            weight: s.weight,
            date: w.completedAt,
          };
        }
      }
    }
  }

  return {
    totalWorkouts: history.length,
    totalSets,
    totalReps,
    totalVolume,
    bestVolumeWorkout: bestVol,
    maxWeightByExercise: maxWeight,
    maxRepsByExercise: maxReps,
    best1RMByExercise: best1RM,
  };
}
