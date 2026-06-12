// Client-side helper that builds a compact snapshot of the user's app data
// (profile, today's nutrition, recent workouts, weight log) to send to the AI coach.
import type { Profile } from "./profile";
import { loadLog, loadGoals, macrosFor, entriesOn, type LogEntry } from "./foods";
import { loadCompleted } from "./workoutSessionStore";
import { computePlan } from "./calorieEngine";
import { loadWeightLog } from "./weightLogStore";

export interface CoachUserContext {
  profile: {
    name?: string;
    goal?: string;
    experience?: string;
    equipment?: string;
    daysPerWeek?: number;
    sessionMinutes?: number;
    focusAreas?: string[];
    age?: number;
    gender?: string;
    heightCm?: number;
    currentWeightKg?: number;
    goalWeightKg?: number;
    activityLevel?: string;
    goalTargetDate?: string;
    injuries?: string;
    deficitSplit?: string;
  } | null;
  plan: {
    maintenanceKcal?: number;
    recommendedIntakeKcal?: number;
    dailyDeficitKcal?: number;
    foodDeficitKcal?: number;
    exerciseBurnTargetKcal?: number;
    weeklyChangeLb?: number;
    isAggressive?: boolean;
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
  recentWeightLog: { date: string; weightLb: number }[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildCoachContext(profile: Profile | null): CoachUserContext {
  let plan: CoachUserContext["plan"] = null;
  try {
    if (profile) {
      const p = computePlan(profile as any);
      plan = {
        maintenanceKcal: Math.round(p.maintenanceKcal),
        recommendedIntakeKcal: Math.round(p.recommendedIntakeKcal),
        dailyDeficitKcal: Math.round(p.dailyDeficitKcal),
        foodDeficitKcal: Math.round(p.foodDeficitKcal),
        exerciseBurnTargetKcal: Math.round(p.exerciseBurnTargetKcal),
        weeklyChangeLb: Number(p.weeklyChangeLb?.toFixed?.(2) ?? 0),
        isAggressive: p.isAggressive,
      };
    }
  } catch { /* ignore */ }

  const goals = loadGoals();
  const log = loadLog();
  const today = todayISO();
  const todayEntries = entriesOn(log, today);
  const totals = todayEntries.reduce(
    (acc: { kcal: number; protein: number; carbs: number; fat: number }, e: LogEntry) => {
      const m = macrosFor(e);
      acc.kcal += m.kcal; acc.protein += m.protein; acc.carbs += m.carbs; acc.fat += m.fat;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const meals = todayEntries.map((e: LogEntry) => {
    const m = macrosFor(e);
    return { meal: e.meal, kcal: Math.round(m.kcal), protein: Math.round(m.protein) };
  });

  const completed = loadCompleted().slice(-5).reverse();
  const recentWorkouts = completed.map((c) => ({
    title: c.workoutTitle,
    completedAt: c.completedAt,
    exercises: c.exercises.map((ex) => ({
      name: ex.exerciseName,
      sets: ex.sets.filter((s) => s.completed).length,
      topWeight: ex.sets.reduce<number | undefined>(
        (max, s) => (s.completed && s.weight ? Math.max(max ?? 0, s.weight) : max),
        undefined,
      ),
    })),
  }));

  const weightLog = loadWeightLog().slice(-14).map((w) => ({
    date: w.date,
    weightLb: w.weightLb,
  }));

  return {
    profile: profile
      ? {
          name: profile.name,
          goal: profile.goal,
          experience: profile.experience,
          equipment: profile.equipment,
          daysPerWeek: profile.daysPerWeek,
          sessionMinutes: profile.sessionMinutes,
          focusAreas: profile.focusAreas,
          age: (profile as any).age,
          gender: (profile as any).gender,
          heightCm: profile.heightCm,
          currentWeightKg: profile.currentWeightKg,
          goalWeightKg: profile.goalWeightKg,
          activityLevel: (profile as any).activityLevel,
          goalTargetDate: (profile as any).goalTargetDate,
          injuries: (profile as any).injuries ?? (profile as any).notes,
          deficitSplit: (profile as any).deficitSplit,
        }
      : null,
    plan,
    nutritionToday: {
      date: today,
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
