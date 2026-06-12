// Client-side helper that builds a compact snapshot of the user's app data
// (profile, today's nutrition, recent workouts, weight log) to send to the AI coach.
import type { Profile } from "./profile";
import { loadLog, loadGoals, macrosFor, entriesOn } from "./foods";
import { getCompletedWorkouts } from "./workoutSessionStore";
import { computePlan } from "./calorieEngine";

export interface CoachUserContext {
  profile: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
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

interface WeightEntry { id: string; kg: number; date: string }

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
  let plan: Record<string, unknown> | null = null;
  try {
    if (profile) {
      const p = computePlan(profile as unknown as Parameters<typeof computePlan>[0]);
      plan = {
        maintenanceKcal: Math.round(p.maintenanceKcal),
        recommendedIntakeKcal: Math.round(p.recommendedIntakeKcal),
        dailyDeficitKcal: Math.round(p.dailyDeficitKcal),
        foodDeficitKcal: Math.round(p.foodDeficitKcal),
        exerciseBurnTargetKcal: Math.round(p.exerciseBurnTargetKcal),
        weeklyChangeLb: Number((p.weeklyChangeLb ?? 0).toFixed(2)),
        isAggressive: p.isAggressive,
      };
    }
  } catch { /* ignore */ }

  const goals = loadGoals();
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
  return {
    profile: p
      ? {
          name: p.name,
          goal: p.goal,
          experience: p.experience,
          equipment: p.equipment,
          daysPerWeek: p.daysPerWeek,
          sessionMinutes: p.sessionMinutes,
          focusAreas: p.focusAreas,
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
