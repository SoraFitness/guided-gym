import { useSyncExternalStore } from "react";
import type { EquipmentSetup, ExperienceLevel, FocusArea, Goal, Profile } from "./profile";
import type { WorkoutSplitId } from "./workoutSplits";

export interface WorkoutPlanInput {
  goal: Goal;
  experience: ExperienceLevel;
  equipment: EquipmentSetup;
  focusAreas: FocusArea[];
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 20 | 30 | 45 | 60;
  workoutSplit?: WorkoutSplitId;
  notes?: string;
}

export interface SavedWorkoutPlan {
  id: string;
  name: string;
  summary: string;
  createdAt: string;
  source: "ai" | "smart";
  input: WorkoutPlanInput;
  workoutIds: string[];
}

const KEY = "fitness:savedWorkoutPlans:v1";
export const WORKOUT_PLANS_CHANGE_EVT = "fitness:workout-plans-change";

let cache: SavedWorkoutPlan[] | undefined;

export function getSavedWorkoutPlans(): SavedWorkoutPlan[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as SavedWorkoutPlan[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function replaceSavedWorkoutPlans(plans: SavedWorkoutPlan[]) {
  cache = [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cache));
  window.dispatchEvent(new Event(WORKOUT_PLANS_CHANGE_EVT));
}

export function saveWorkoutPlan(plan: SavedWorkoutPlan) {
  replaceSavedWorkoutPlans([plan, ...getSavedWorkoutPlans().filter((item) => item.id !== plan.id)]);
}

export function getActiveWorkoutPlan(plans: SavedWorkoutPlan[], profile: Profile | null) {
  if (!profile) return undefined;
  return plans.find((plan) => {
    const input = plan.input;
    const planFocus = [...input.focusAreas].sort().join("|");
    const profileFocus = [...profile.focusAreas].sort().join("|");
    return (
      input.goal === profile.goal &&
      input.experience === profile.experience &&
      input.equipment === profile.equipment &&
      input.daysPerWeek === profile.daysPerWeek &&
      input.sessionMinutes === profile.sessionMinutes &&
      (input.workoutSplit ?? "auto") === (profile.workoutSplit ?? "auto") &&
      planFocus === profileFocus
    );
  });
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const invalidate = () => {
    cache = undefined;
    callback();
  };
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === KEY) invalidate();
  };
  window.addEventListener(WORKOUT_PLANS_CHANGE_EVT, invalidate);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WORKOUT_PLANS_CHANGE_EVT, invalidate);
    window.removeEventListener("storage", onStorage);
  };
}

const emptyPlans: SavedWorkoutPlan[] = [];

export function useSavedWorkoutPlans(): SavedWorkoutPlan[] {
  return useSyncExternalStore(subscribe, getSavedWorkoutPlans, () => emptyPlans);
}
