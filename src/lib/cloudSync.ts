// Cloud sync engine: keeps the localStorage stores and Supabase in sync for
// signed-in users. Guests keep working fully offline — nothing here runs
// without a session.
//
// How it works:
//   1. On login, `startCloudSync(userId)` hydrates: cloud rows are merged into
//      the local stores (union by id, local edits win), then the merged state
//      is pushed back up so guest-mode data gets uploaded on first sign-in.
//   2. Afterwards it listens to the stores' existing change events and pushes
//      the affected domain with a short debounce (idempotent upserts).
//   3. Deletions are propagated by tracking the row ids this session has seen
//      ("known ids"): anything known that disappears locally is deleted in the
//      cloud. Rows created by another device stay untouched until the next
//      hydration.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { entryFood, loadLog, loadGoals, type LogEntry, type Meal } from "./foods";
import type { NutrientDetails } from "./nutritionQuality";
import { replaceEntries, setNutritionGoals } from "./nutritionStore";
import {
  getCompletedWorkouts,
  replaceCompletedWorkouts,
  getPreferredUnit,
  setPreferredUnit,
  type CompletedWorkout,
  type WeightUnit,
} from "./workoutSessionStore";
import { getWeightLogEntries, replaceWeightLog, type WeightEntry } from "./weightLogStore";
import { getScans, replaceScans } from "./bodyScanStore";
import type { BodyScanResult } from "./bodyScan";
import {
  getWorkoutLogEntries,
  replaceWorkoutLogEntries,
  type WorkoutLogEntry,
} from "./progressStore";
import {
  getRecentFoodsSnapshot,
  getFavoriteFoodsSnapshot,
  replaceFoodHistory,
  type StoredFood,
} from "./foodHistoryStore";
import { readStoredProfile, writeStoredProfile, PROFILE_CHANGE_EVT, type Profile } from "./profile";
import { syncProfileToCloud } from "./profileSync";
import {
  getSavedWorkoutPlans,
  replaceSavedWorkoutPlans,
  WORKOUT_PLANS_CHANGE_EVT,
  type SavedWorkoutPlan,
} from "./workoutPlanStore";

const LB_PER_KG = 1 / 0.45359237;
const KG_PER_LB = 0.45359237;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

const round1 = (n: number) => Math.round(n * 10) / 10;

type Domain = "profile" | "food" | "workouts" | "weight" | "bodyScans" | "appState";

const DOMAIN_EVENTS: Record<Domain, string[]> = {
  profile: [PROFILE_CHANGE_EVT],
  food: ["fitness:nutrition-change"], // entries + goals share this event
  workouts: ["fitness:history-change"],
  weight: ["fitness:weightlog-change"],
  bodyScans: ["fitness:bodyScans-change"],
  appState: [
    "fitness:progress-change",
    "fitness:foodhistory-change",
    "fitness:session-change",
    WORKOUT_PLANS_CHANGE_EVT,
  ],
};

const APP_STATE_KEYS = {
  minutes: "workoutMinutesLog",
  recent: "foodRecent",
  favorites: "foodFavorites",
  unit: "weightUnit",
  workoutPlans: "savedWorkoutPlans",
} as const;

/* ---------------- row <-> store mapping ---------------- */

function foodEntryToRow(e: LogEntry, userId: string) {
  const f = entryFood(e);
  return {
    id: e.id,
    user_id: userId,
    logged_on: e.loggedAt.slice(0, 10),
    logged_at: e.loggedAt,
    meal: e.meal.toLowerCase(),
    name: f.name,
    calories: Math.round(f.kcal * e.servings),
    protein_g: round1(f.protein * e.servings),
    carbs_g: round1(f.carbs * e.servings),
    fat_g: round1(f.fat * e.servings),
    nutrition_details: (f.nutrients ?? {}) as unknown as Json,
    entry: e as unknown as Json,
  };
}

function rowToFoodEntry(row: {
  id: string;
  entry: Json | null;
  meal: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrition_details: Json | null;
  logged_at: string | null;
  logged_on: string;
  created_at: string;
}): LogEntry {
  if (row.entry && typeof row.entry === "object" && (row.entry as { id?: string }).id) {
    return row.entry as unknown as LogEntry;
  }
  // Row created outside the app (e.g. weekly quick-log) — synthesize an entry.
  const meal = (row.meal.charAt(0).toUpperCase() + row.meal.slice(1)) as Meal;
  return {
    id: row.id,
    meal,
    servings: 1,
    loggedAt: row.logged_at ?? row.created_at ?? `${row.logged_on}T12:00:00.000Z`,
    custom: {
      name: row.name,
      serving: "1 serving",
      kcal: row.calories,
      protein: Number(row.protein_g),
      carbs: Number(row.carbs_g),
      fat: Number(row.fat_g),
      source: "manual",
      nutrients:
        row.nutrition_details && typeof row.nutrition_details === "object"
          ? (row.nutrition_details as NutrientDetails)
          : undefined,
    },
  };
}

function workoutToRow(w: CompletedWorkout, userId: string) {
  const volumeKg = w.unit === "lb" ? round1(w.totalVolume * KG_PER_LB) : round1(w.totalVolume);
  return {
    id: w.id,
    user_id: userId,
    performed_on: w.completedAt.slice(0, 10),
    name: w.workoutTitle || "Workout",
    duration_min: Math.max(0, Math.round(w.durationMin)),
    total_sets: w.totalSets,
    total_reps: w.totalReps,
    total_volume_kg: volumeKg,
    muscle_groups: [...new Set(w.exercises.map((e) => e.muscleGroup).filter(Boolean))],
    calories: Math.max(0, Math.round(w.calories || 0)),
    started_at: w.startedAt,
    completed_at: w.completedAt,
    unit: w.unit,
    workout_id: w.workoutId || null,
    notes: w.notes ?? null,
    session: w as unknown as Json,
  };
}

function rowToWorkout(row: {
  id: string;
  session: Json | null;
  name: string;
  performed_on: string;
  duration_min: number;
  total_sets: number;
  total_reps: number;
  total_volume_kg: number;
  calories: number;
  started_at: string | null;
  completed_at: string | null;
  unit: string;
  workout_id: string | null;
  notes: string | null;
}): CompletedWorkout {
  if (row.session && typeof row.session === "object" && (row.session as { id?: string }).id) {
    return row.session as unknown as CompletedWorkout;
  }
  const unit: WeightUnit = row.unit === "kg" ? "kg" : "lb";
  const completedAt = row.completed_at ?? `${row.performed_on}T12:00:00.000Z`;
  const volume =
    unit === "lb" ? round1(Number(row.total_volume_kg) * LB_PER_KG) : Number(row.total_volume_kg);
  return {
    id: row.id,
    workoutId: row.workout_id ?? "",
    workoutTitle: row.name,
    startedAt: row.started_at ?? completedAt,
    completedAt,
    durationMin: row.duration_min,
    calories: row.calories ?? 0,
    unit,
    exercises: [],
    totalSets: row.total_sets,
    totalReps: row.total_reps,
    totalVolume: volume,
    notes: row.notes ?? undefined,
  };
}

/* ---------------- merge helpers ---------------- */

function mergeById<T>(local: T[], cloud: T[], idOf: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const c of cloud) map.set(idOf(c), c);
  for (const l of local) map.set(idOf(l), l); // local wins on conflict
  return [...map.values()];
}

/* ---------------- engine ---------------- */

export function startCloudSync(userId: string): () => void {
  let stopped = false;
  let applyingRemote = false;
  const timers = new Map<Domain, ReturnType<typeof setTimeout>>();
  const lastPushed = new Map<Domain, string>();
  // Row keys this session has seen per table — used to propagate deletions.
  const known = {
    food: new Set<string>(),
    workouts: new Set<string>(),
    weight: new Set<string>(), // keyed by logged_on (one row per day)
    bodyScans: new Set<string>(),
  };

  /* ----- push (local -> cloud) ----- */

  async function flush(domain: Domain) {
    if (stopped) return;
    try {
      switch (domain) {
        case "profile": {
          const local = readStoredProfile();
          if (local) await syncProfileToCloud(userId, local);
          break;
        }
        case "food": {
          const entries = loadLog().filter((e) => isUuid(e.id));
          const snapshot = JSON.stringify(entries) + JSON.stringify(loadGoals());
          if (lastPushed.get("food") === snapshot) return;

          const rows = entries.map((e) => foodEntryToRow(e, userId));
          if (rows.length) {
            const { error } = await supabase.from("food_logs").upsert(rows, { onConflict: "id" });
            if (error) throw error;
          }
          const localIds = new Set(entries.map((e) => e.id));
          const gone = [...known.food].filter((id) => !localIds.has(id));
          if (gone.length) {
            await supabase.from("food_logs").delete().eq("user_id", userId).in("id", gone);
          }
          known.food = localIds;

          const g = loadGoals();
          const { error: gErr } = await supabase.from("user_goals").upsert(
            {
              user_id: userId,
              daily_calorie_target: Math.round(g.kcal),
              daily_protein_g_target: Math.round(g.protein),
              daily_carbs_g_target: Math.round(g.carbs),
              daily_fat_g_target: Math.round(g.fat),
            },
            { onConflict: "user_id" },
          );
          if (gErr) throw gErr;
          lastPushed.set("food", snapshot);
          break;
        }
        case "workouts": {
          const workouts = getCompletedWorkouts().filter((w) => isUuid(w.id));
          const snapshot = JSON.stringify(
            workouts.map((w) => w.id + (w.notes ?? "") + w.totalSets + w.totalVolume),
          );
          if (lastPushed.get("workouts") === snapshot) return;

          const rows = workouts.map((w) => workoutToRow(w, userId));
          if (rows.length) {
            const { error } = await supabase
              .from("workout_logs")
              .upsert(rows, { onConflict: "id" });
            if (error) throw error;
          }
          const localIds = new Set(workouts.map((w) => w.id));
          const gone = [...known.workouts].filter((id) => !localIds.has(id));
          if (gone.length) {
            await supabase.from("workout_logs").delete().eq("user_id", userId).in("id", gone);
          }
          known.workouts = localIds;
          lastPushed.set("workouts", snapshot);
          break;
        }
        case "weight": {
          const entries = getWeightLogEntries();
          const snapshot = JSON.stringify(entries);
          if (lastPushed.get("weight") === snapshot) return;

          // One row per day; last entry for a day wins.
          const byDay = new Map<string, WeightEntry>();
          for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
            byDay.set(e.date.slice(0, 10), e);
          }
          const rows = [...byDay.entries()].map(([day, e]) => ({
            user_id: userId,
            logged_on: day,
            weight_kg: e.kg,
          }));
          if (rows.length) {
            const { error } = await supabase
              .from("weight_logs")
              .upsert(rows, { onConflict: "user_id,logged_on" });
            if (error) throw error;
          }
          const localDays = new Set(byDay.keys());
          const gone = [...known.weight].filter((d) => !localDays.has(d));
          if (gone.length) {
            await supabase.from("weight_logs").delete().eq("user_id", userId).in("logged_on", gone);
          }
          known.weight = localDays;
          lastPushed.set("weight", snapshot);
          break;
        }
        case "bodyScans": {
          const scans = getScans().filter((s) => isUuid(s.id));
          const snapshot = JSON.stringify(scans.map((s) => s.id));
          if (lastPushed.get("bodyScans") === snapshot) return;

          const rows = scans.map((s) => ({
            id: s.id,
            user_id: userId,
            created_at: s.createdAt,
            result: s as unknown as Json,
          }));
          if (rows.length) {
            const { error } = await supabase.from("body_scans").upsert(rows, { onConflict: "id" });
            if (error) throw error;
          }
          const localIds = new Set(scans.map((s) => s.id));
          const gone = [...known.bodyScans].filter((id) => !localIds.has(id));
          if (gone.length) {
            await supabase.from("body_scans").delete().eq("user_id", userId).in("id", gone);
          }
          known.bodyScans = localIds;
          lastPushed.set("bodyScans", snapshot);
          break;
        }
        case "appState": {
          const payload = {
            [APP_STATE_KEYS.minutes]: getWorkoutLogEntries() as unknown as Json,
            [APP_STATE_KEYS.recent]: getRecentFoodsSnapshot() as unknown as Json,
            [APP_STATE_KEYS.favorites]: getFavoriteFoodsSnapshot() as unknown as Json,
            [APP_STATE_KEYS.unit]: getPreferredUnit() as unknown as Json,
            [APP_STATE_KEYS.workoutPlans]: getSavedWorkoutPlans() as unknown as Json,
          };
          const snapshot = JSON.stringify(payload);
          if (lastPushed.get("appState") === snapshot) return;
          const rows = Object.entries(payload).map(([key, value]) => ({
            user_id: userId,
            key,
            value,
          }));
          const { error } = await supabase
            .from("user_app_state")
            .upsert(rows, { onConflict: "user_id,key" });
          if (error) throw error;
          lastPushed.set("appState", snapshot);
          break;
        }
      }
    } catch (e) {
      console.warn(`[cloudSync] push failed for ${domain}`, e);
    }
  }

  function schedule(domain: Domain) {
    if (stopped || applyingRemote) return;
    const existing = timers.get(domain);
    if (existing) clearTimeout(existing);
    timers.set(
      domain,
      setTimeout(() => {
        timers.delete(domain);
        void flush(domain);
      }, 1200),
    );
  }

  /* ----- hydrate (cloud -> local) ----- */

  async function hydrate() {
    const [profileRes, goalsRes, foodRes, workoutRes, weightRes, scanRes, stateRes] =
      await Promise.all([
        supabase.from("user_profiles").select("profile").eq("user_id", userId).maybeSingle(),
        supabase.from("user_goals").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("food_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: true })
          .limit(2000),
        supabase
          .from("workout_logs")
          .select("*")
          .eq("user_id", userId)
          .order("performed_on", { ascending: true })
          .limit(1000),
        supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_on", { ascending: true })
          .limit(1000),
        supabase
          .from("body_scans")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("user_app_state").select("key,value").eq("user_id", userId),
      ]);

    if (stopped) return;
    const localProfileBeforeHydration = readStoredProfile();
    const cloudProfile = profileRes.data?.profile as Profile | undefined;
    const localCompletedAt = localProfileBeforeHydration?.completedAt
      ? Date.parse(localProfileBeforeHydration.completedAt)
      : 0;
    const cloudCompletedAt = cloudProfile?.completedAt ? Date.parse(cloudProfile.completedAt) : 0;
    const preferFreshLocalOnboarding =
      Boolean(localProfileBeforeHydration) &&
      (!cloudProfile || localCompletedAt > cloudCompletedAt);

    applyingRemote = true;
    try {
      // A newly completed local onboarding is newer than an existing cloud
      // profile and must be uploaded instead of being overwritten on entry.
      if (
        cloudProfile &&
        typeof cloudProfile === "object" &&
        cloudProfile.name &&
        !preferFreshLocalOnboarding
      ) {
        writeStoredProfile(cloudProfile);
      }

      // Keep the fresh onboarding's newly calculated targets alongside its
      // profile; otherwise cloud targets remain authoritative.
      if (goalsRes.data && !preferFreshLocalOnboarding) {
        setNutritionGoals({
          kcal: goalsRes.data.daily_calorie_target,
          protein: goalsRes.data.daily_protein_g_target,
          carbs: goalsRes.data.daily_carbs_g_target ?? 230,
          fat: goalsRes.data.daily_fat_g_target ?? 70,
        });
      }

      // Food log: union by id.
      const cloudEntries = (foodRes.data ?? []).map(rowToFoodEntry);
      const mergedFood = mergeById(loadLog(), cloudEntries, (e) => e.id).sort((a, b) =>
        a.loggedAt.localeCompare(b.loggedAt),
      );
      replaceEntries(mergedFood);
      for (const r of foodRes.data ?? []) known.food.add(r.id);

      // Completed workouts: union by id, newest first.
      const cloudWorkouts = (workoutRes.data ?? []).map(rowToWorkout);
      const mergedWorkouts = mergeById(getCompletedWorkouts(), cloudWorkouts, (w) => w.id).sort(
        (a, b) => b.completedAt.localeCompare(a.completedAt),
      );
      replaceCompletedWorkouts(mergedWorkouts);
      for (const r of workoutRes.data ?? []) known.workouts.add(r.id);

      // Weight: union by day, local wins.
      const cloudWeights: WeightEntry[] = (weightRes.data ?? []).map((r) => ({
        id: r.id,
        kg: Number(r.weight_kg),
        date: `${r.logged_on}T12:00:00.000Z`,
      }));
      const mergedWeight = mergeById(getWeightLogEntries(), cloudWeights, (e) =>
        e.date.slice(0, 10),
      ).sort((a, b) => a.date.localeCompare(b.date));
      replaceWeightLog(mergedWeight);
      for (const r of weightRes.data ?? []) known.weight.add(r.logged_on);

      // Body scans: union by id, newest first.
      const cloudScans = (scanRes.data ?? [])
        .map((r) => r.result as unknown as BodyScanResult)
        .filter((s) => s && typeof s === "object" && s.id);
      const mergedScans = mergeById(getScans(), cloudScans, (s) => s.id).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      replaceScans(mergedScans);
      // Only track actual BodyScanResult rows for deletion propagation. Intake
      // records also live in body_scans but intentionally omit a root result.id.
      for (const scan of cloudScans) known.bodyScans.add(scan.id);

      // Misc app state.
      const state = new Map((stateRes.data ?? []).map((r) => [r.key, r.value]));
      const cloudMinutes = (state.get(APP_STATE_KEYS.minutes) as WorkoutLogEntry[] | null) ?? [];
      if (Array.isArray(cloudMinutes) && cloudMinutes.length) {
        replaceWorkoutLogEntries(
          mergeById(getWorkoutLogEntries(), cloudMinutes, (e) => e.id).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
      }
      const cloudRecent = (state.get(APP_STATE_KEYS.recent) as StoredFood[] | null) ?? [];
      const cloudFavs = (state.get(APP_STATE_KEYS.favorites) as StoredFood[] | null) ?? [];
      if (
        (Array.isArray(cloudRecent) && cloudRecent.length) ||
        (Array.isArray(cloudFavs) && cloudFavs.length)
      ) {
        replaceFoodHistory(
          mergeById(getRecentFoodsSnapshot(), cloudRecent, (f) => f.id),
          mergeById(getFavoriteFoodsSnapshot(), cloudFavs, (f) => f.id),
        );
      }
      const cloudUnit = state.get(APP_STATE_KEYS.unit);
      const hasLocalUnit = localStorage.getItem("fitness:weightUnit") != null;
      if (!hasLocalUnit && (cloudUnit === "kg" || cloudUnit === "lb")) {
        setPreferredUnit(cloudUnit);
      }
      const cloudPlans =
        (state.get(APP_STATE_KEYS.workoutPlans) as SavedWorkoutPlan[] | null) ?? [];
      if (Array.isArray(cloudPlans) && cloudPlans.length) {
        replaceSavedWorkoutPlans(
          mergeById(getSavedWorkoutPlans(), cloudPlans, (plan) => plan.id).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
        );
      }
    } finally {
      applyingRemote = false;
    }

    // Push the merged state back up (uploads guest data on first sign-in,
    // creates the profile/goals rows for brand-new accounts).
    await Promise.all(
      (["profile", "food", "workouts", "weight", "bodyScans", "appState"] as Domain[]).map(flush),
    );
  }

  /* ----- wire up ----- */

  const listeners: Array<[string, () => void]> = [];
  for (const [domain, events] of Object.entries(DOMAIN_EVENTS) as [Domain, string[]][]) {
    for (const evt of events) {
      const handler = () => schedule(domain);
      window.addEventListener(evt, handler);
      listeners.push([evt, handler]);
    }
  }

  void hydrate().catch((e) => console.warn("[cloudSync] hydration failed", e));

  return () => {
    stopped = true;
    for (const [evt, handler] of listeners) window.removeEventListener(evt, handler);
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  };
}
