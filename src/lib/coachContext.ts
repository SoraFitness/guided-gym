// Client-side helper that builds a compact snapshot of the user's app data
// (profile, today's nutrition, recent workouts, weight log) to send to the AI coach.
import type { Profile } from "./profile";
import { loadLog, loadGoals, macrosFor, entriesOn } from "./foods";
import { getCompletedWorkouts } from "./workoutSessionStore";
import { nutritionPlanFor } from "./nutritionService";
import { getActiveWorkoutPlan, getSavedWorkoutPlans } from "./workoutPlanStore";

export interface CoachUserContext {
  profile: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  activeWorkoutPlan: {
    name: string;
    summary: string;
    source: "ai" | "smart";
    workoutIds: string[];
    input: Record<string, unknown>;
  } | null;
  nutritionToday: {
    date: string;
    target: { kcal: number; protein: number; carbs: number; fat: number };
    eaten: { kcal: number; protein: number; carbs: number; fat: number };
    remaining: { kcal: number; protein: number; carbs: number; fat: number };
    meals: { meal: string; kcal: number; protein: number }[];
  };
  recentWorkouts: {
    title: string;
    completedAt: string;
    exercises: { name: string; sets: number; topWeight?: number }[];
  }[];
  recentWeightLog: { date: string; kg: number }[];
}

interface WeightEntry {
  id: string;
  kg: number;
  date: string;
}

function readWeightLog(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("fitness:weightlog");
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch {
    return [];
  }
}

export function buildCoachContext(profile: Profile | null): CoachUserContext {
  const goals = loadGoals();
  let plan: Record<string, unknown> | null = null;
  try {
    if (profile) {
      const p = nutritionPlanFor(profile);
      // Describe the plan from the target the member actually sees in the app, which
      // can differ from today's recommendation if they set it themselves or earlier.
      const targetVsMaintenanceKcal = Math.round(goals.kcal - p.maintenanceKcal);
      plan = {
        maintenanceKcal: Math.round(p.maintenanceKcal),
        savedTargetKcal: goals.kcal,
        targetVsMaintenanceKcal,
        targetStance:
          targetVsMaintenanceKcal <= -100
            ? "deficit"
            : targetVsMaintenanceKcal >= 100
              ? "surplus"
              : "maintenance",
        recommendedIntakeKcal: Math.round(p.recommendedIntakeKcal),
        recommendedWeeklyChangeKg: Number(p.weeklyChangeKg.toFixed(2)),
        isAggressive: p.isAggressive,
      };
    }
  } catch {
    /* ignore */
  }

  const log = loadLog();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const todayEntries = entriesOn(log, today);
  const totals = macrosFor(todayEntries);

  const meals = todayEntries.map((e) => {
    const m = macrosFor([e]);
    return { meal: e.meal, kcal: Math.round(m.kcal), protein: Math.round(m.protein) };
  });

  const completed = getCompletedWorkouts().slice(-5).reverse();
  const recentWorkouts = completed.map((c) => ({
    title: c.workoutTitle,
    completedAt: c.completedAt ?? "",
    exercises: c.exercises.map((ex) => {
      let top: number | undefined;
      for (const s of ex.sets) {
        if (s.completed && s.weight) top = Math.max(top ?? 0, s.weight);
      }
      return {
        name: ex.exerciseName,
        sets: ex.sets.filter((s) => s.completed).length,
        topWeight: top,
      };
    }),
  }));

  const weightLog = readWeightLog()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((w) => ({ date: w.date.slice(0, 10), kg: w.kg }));

  const p = profile as unknown as Record<string, unknown> | null;
  const savedWorkoutPlan = getActiveWorkoutPlan(getSavedWorkoutPlans(), profile);
  return {
    profile: p
      ? {
          name: p.name,
          goal: p.goal,
          goals: p.goals,
          experience: p.experience,
          equipment: p.equipment,
          daysPerWeek: p.daysPerWeek,
          sessionMinutes: p.sessionMinutes,
          focusAreas: p.focusAreas,
          workoutSplit: p.workoutSplit,
          equipmentItems: p.equipmentItems,
          nutritionPlan: p.nutritionPlan,
          age: p.age,
          gender: p.gender,
          heightCm: p.heightCm,
          currentWeightKg: p.currentWeightKg,
          goalWeightKg: p.goalWeightKg,
          activityLevel: p.activityLevel,
          goalTargetDate: p.goalTargetDate,
          injuries: p.injuries ?? p.notes,
          deficitSplit: p.deficitSplit,
        }
      : null,
    plan,
    activeWorkoutPlan: savedWorkoutPlan
      ? {
          name: savedWorkoutPlan.name,
          summary: savedWorkoutPlan.summary,
          source: savedWorkoutPlan.source,
          workoutIds: savedWorkoutPlan.workoutIds,
          input: savedWorkoutPlan.input as unknown as Record<string, unknown>,
        }
      : null,
    nutritionToday: {
      date: todayISO,
      target: { kcal: goals.kcal, protein: goals.protein, carbs: goals.carbs, fat: goals.fat },
      eaten: {
        kcal: Math.round(totals.kcal),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
      },
      remaining: {
        kcal: Math.max(0, Math.round(goals.kcal - totals.kcal)),
        protein: Math.max(0, Math.round(goals.protein - totals.protein)),
        carbs: Math.max(0, Math.round(goals.carbs - totals.carbs)),
        fat: Math.max(0, Math.round(goals.fat - totals.fat)),
      },
      meals,
    },
    recentWorkouts,
    recentWeightLog: weightLog,
  };
}
