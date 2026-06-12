import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

// ----- Date helpers (Monday-start week, UTC) -----
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeekUTC(ref: Date = new Date()): Date {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // 0=Mon
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
function endOfWeekUTC(start: Date): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}
function daysBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const s = new Date(`${a}T00:00:00Z`);
  const e = new Date(`${b}T00:00:00Z`);
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) out.push(toISODate(d));
  return out;
}

export interface WeeklyReportDTO {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  consistencyScore: number;
  workoutsCompleted: number;
  plannedWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  averageCalories: number;
  averageProteinG: number;
  proteinHitDays: number;
  calorieAdherence: number; // 0-100
  startingWeightKg: number | null;
  endingWeightKg: number | null;
  weightChangeKg: number | null;
  topMuscleGroups: { name: string; count: number }[];
  aiSummary: string;
  achievements: { id: string; label: string; icon: string }[];
  nextWeekPlan: {
    workouts: number;
    proteinDays: number;
    logDays: number;
    cardio: number;
    photos: number;
    notes: string;
  };
  isFinalized: boolean;
  // Breakdown helpers for UI
  perDay: {
    date: string;
    workouts: number;
    calories: number;
    protein: number;
    steps: number;
  }[];
  prs: { name: string; note: string | null }[];
  missedWorkouts: number;
}

interface UserGoals {
  weekly_workout_target: number;
  daily_calorie_target: number;
  daily_protein_g_target: number;
  daily_step_target: number;
  goal_weight_kg: number | null;
  starting_weight_kg: number | null;
}

const DEFAULT_GOALS: UserGoals = {
  weekly_workout_target: 4,
  daily_calorie_target: 2200,
  daily_protein_g_target: 140,
  daily_step_target: 8000,
  goal_weight_kg: null,
  starting_weight_kg: null,
};

// Core computation - works with any supabase client (user-scoped or admin).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeReport(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string,
  goals: UserGoals,
): Promise<WeeklyReportDTO> {
  const [workouts, foods, weights, activity] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("name,performed_on,duration_min,total_sets,total_reps,total_volume_kg,muscle_groups,is_pr,pr_note")
      .eq("user_id", userId)
      .gte("performed_on", weekStart)
      .lte("performed_on", weekEnd),
    supabase
      .from("food_logs")
      .select("logged_on,calories,protein_g,carbs_g,fat_g")
      .eq("user_id", userId)
      .gte("logged_on", weekStart)
      .lte("logged_on", weekEnd),
    supabase
      .from("weight_logs")
      .select("logged_on,weight_kg")
      .eq("user_id", userId)
      .gte("logged_on", weekStart)
      .lte("logged_on", weekEnd)
      .order("logged_on", { ascending: true }),
    supabase
      .from("daily_activity")
      .select("activity_on,steps,sleep_hours,recovery_score")
      .eq("user_id", userId)
      .gte("activity_on", weekStart)
      .lte("activity_on", weekEnd),
  ]);

  const wkRows = (workouts.data ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const fdRows = (foods.data ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const wtRows = (weights.data ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const acRows = (activity.data ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  const dates = daysBetween(weekStart, weekEnd);

  // Workouts
  const workoutsCompleted = wkRows.length;
  const totalSets = wkRows.reduce((s, r) => s + Number(r.total_sets ?? 0), 0);
  const totalReps = wkRows.reduce((s, r) => s + Number(r.total_reps ?? 0), 0);
  const totalVolumeKg = +wkRows.reduce((s, r) => s + Number(r.total_volume_kg ?? 0), 0).toFixed(1);
  const plannedWorkouts = goals.weekly_workout_target;
  const missedWorkouts = Math.max(0, plannedWorkouts - workoutsCompleted);
  const muscleCounts = new Map<string, number>();
  for (const r of wkRows) {
    for (const m of (r.muscle_groups ?? []) as string[]) {
      muscleCounts.set(m, (muscleCounts.get(m) ?? 0) + 1);
    }
  }
  const topMuscleGroups = [...muscleCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const prs = wkRows.filter((r) => r.is_pr).map((r) => ({ name: r.name as string, note: (r.pr_note as string | null) ?? null }));

  // Nutrition by day
  const calByDay = new Map<string, number>();
  const proByDay = new Map<string, number>();
  for (const f of fdRows) {
    const d = f.logged_on as string;
    calByDay.set(d, (calByDay.get(d) ?? 0) + Number(f.calories ?? 0));
    proByDay.set(d, (proByDay.get(d) ?? 0) + Number(f.protein_g ?? 0));
  }
  const loggedDays = new Set([...calByDay.keys()]).size;
  const loggedCalDays = [...calByDay.values()].filter((v) => v > 0);
  const averageCalories = loggedCalDays.length
    ? Math.round(loggedCalDays.reduce((s, v) => s + v, 0) / loggedCalDays.length)
    : 0;
  const averageProteinG = loggedDays
    ? Math.round([...proByDay.values()].reduce((s, v) => s + v, 0) / loggedDays)
    : 0;
  const proteinHitDays = [...proByDay.values()].filter(
    (g) => g >= goals.daily_protein_g_target,
  ).length;

  // Calorie adherence: avg of per-day 1 - |cal - target|/target, only on logged days
  const calTarget = goals.daily_calorie_target || 1;
  const adherenceVals = [...calByDay.values()].map((c) => Math.max(0, 1 - Math.abs(c - calTarget) / calTarget));
  const calorieAdherence = adherenceVals.length
    ? Math.round((adherenceVals.reduce((s, v) => s + v, 0) / adherenceVals.length) * 100)
    : 0;

  // Weights
  const startingWeightKg = wtRows.length ? Number(wtRows[0].weight_kg) : null;
  const endingWeightKg = wtRows.length ? Number(wtRows[wtRows.length - 1].weight_kg) : null;
  const weightChangeKg =
    startingWeightKg !== null && endingWeightKg !== null
      ? +(endingWeightKg - startingWeightKg).toFixed(1)
      : null;

  // Activity
  const stepDays = new Map<string, number>();
  const recoveryScores: number[] = [];
  for (const a of acRows) {
    stepDays.set(a.activity_on as string, Number(a.steps ?? 0));
    if (a.recovery_score) recoveryScores.push(Number(a.recovery_score));
  }
  const activityHitDays = [...stepDays.values()].filter((s) => s >= goals.daily_step_target).length;
  const activityCompletionRate = Math.min(1, activityHitDays / 7);
  const recoveryScore =
    recoveryScores.length > 0
      ? Math.min(1, recoveryScores.reduce((s, v) => s + v, 0) / recoveryScores.length / 100)
      : 0;

  // Consistency rates
  const workoutCompletionRate = Math.min(1, workoutsCompleted / (plannedWorkouts || 1));
  const nutritionLoggingRate = Math.min(1, loggedDays / 7);
  const proteinHitRate = Math.min(1, proteinHitDays / 7);
  const calorieAdherenceRate = calorieAdherence / 100;

  const consistencyScore = Math.round(
    (workoutCompletionRate * 0.3 +
      nutritionLoggingRate * 0.2 +
      proteinHitRate * 0.2 +
      calorieAdherenceRate * 0.15 +
      activityCompletionRate * 0.1 +
      recoveryScore * 0.05) *
      100,
  );

  // Per-day breakdown
  const wkByDay = new Map<string, number>();
  for (const r of wkRows) wkByDay.set(r.performed_on as string, (wkByDay.get(r.performed_on as string) ?? 0) + 1);
  const perDay = dates.map((d) => ({
    date: d,
    workouts: wkByDay.get(d) ?? 0,
    calories: calByDay.get(d) ?? 0,
    protein: Math.round(proByDay.get(d) ?? 0),
    steps: stepDays.get(d) ?? 0,
  }));

  // Achievements
  const achievements: { id: string; label: string; icon: string }[] = [];
  achievements.push({ id: "week_done", label: "Week completed", icon: "trophy" });
  if (workoutsCompleted >= 3) achievements.push({ id: "w3", label: "3 workouts this week", icon: "dumbbell" });
  if (workoutsCompleted >= 5) achievements.push({ id: "w5", label: "5 workouts this week", icon: "flame" });
  if (proteinHitDays >= 5) achievements.push({ id: "p5", label: "Protein goal hit 5+ days", icon: "drumstick" });
  if (loggedDays >= 7) achievements.push({ id: "log7", label: "7-day food logging streak", icon: "notebook" });
  if (prs.length > 0) achievements.push({ id: "pr", label: `New PR — ${prs[0].name}`, icon: "medal" });
  if (
    goals.goal_weight_kg !== null &&
    goals.starting_weight_kg !== null &&
    endingWeightKg !== null
  ) {
    const total = Math.abs(goals.goal_weight_kg - goals.starting_weight_kg);
    if (total > 0) {
      const done = Math.abs(endingWeightKg - goals.starting_weight_kg);
      const pct = Math.round((done / total) * 100);
      if (pct >= 100) achievements.push({ id: "goal100", label: "Goal weight reached!", icon: "target" });
      else if (pct >= 50) achievements.push({ id: "goal50", label: "50% to goal weight", icon: "target" });
      else if (pct >= 25) achievements.push({ id: "goal25", label: "25% to goal weight", icon: "target" });
      else if (pct >= 10) achievements.push({ id: "goal10", label: "10% to goal weight", icon: "target" });
    }
  }

  // Photos this week
  const { count: photoCount } = await supabase
    .from("progress_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("taken_on", weekStart)
    .lte("taken_on", weekEnd);
  if ((photoCount ?? 0) > 0)
    achievements.push({ id: "photo", label: "Progress photo uploaded", icon: "camera" });

  const overallScore = consistencyScore;

  // Heuristic next-week plan
  const nextWeekPlan = {
    workouts: Math.min(6, Math.max(plannedWorkouts, workoutsCompleted < plannedWorkouts ? plannedWorkouts : plannedWorkouts + 1)),
    proteinDays: Math.min(7, Math.max(5, proteinHitDays + 1)),
    logDays: 7,
    cardio: workoutsCompleted >= plannedWorkouts ? 2 : 1,
    photos: 1,
    notes: "",
  };

  return {
    weekStart,
    weekEnd,
    overallScore,
    consistencyScore,
    workoutsCompleted,
    plannedWorkouts,
    totalSets,
    totalReps,
    totalVolumeKg,
    averageCalories,
    averageProteinG,
    proteinHitDays,
    calorieAdherence,
    startingWeightKg,
    endingWeightKg,
    weightChangeKg,
    topMuscleGroups,
    aiSummary: "",
    achievements,
    nextWeekPlan,
    isFinalized: false,
    perDay,
    prs,
    missedWorkouts,
  };
}

async function getOrCreateGoals(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string,
): Promise<UserGoals> {
  const { data } = await supabase
    .from("user_goals")
    .select("weekly_workout_target,daily_calorie_target,daily_protein_g_target,daily_step_target,goal_weight_kg,starting_weight_kg")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_GOALS };
  return {
    weekly_workout_target: Number(data.weekly_workout_target ?? DEFAULT_GOALS.weekly_workout_target),
    daily_calorie_target: Number(data.daily_calorie_target ?? DEFAULT_GOALS.daily_calorie_target),
    daily_protein_g_target: Number(data.daily_protein_g_target ?? DEFAULT_GOALS.daily_protein_g_target),
    daily_step_target: Number(data.daily_step_target ?? DEFAULT_GOALS.daily_step_target),
    goal_weight_kg: data.goal_weight_kg === null || data.goal_weight_kg === undefined ? null : Number(data.goal_weight_kg),
    starting_weight_kg: data.starting_weight_kg === null || data.starting_weight_kg === undefined ? null : Number(data.starting_weight_kg),
  };
}

// ----- Server functions -----

export const computeCurrentWeekReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = startOfWeekUTC();
    const end = endOfWeekUTC(start);
    const goals = await getOrCreateGoals(supabase, userId);
    return computeReport(supabase, userId, toISODate(start), toISODate(end), goals);
  });

export const getWeeklyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { weekStart: string }) => z.object({ weekStart: z.string() }).parse(d))
  .handler(async ({ data, context }): Promise<WeeklyReportDTO> => {
    const { supabase, userId } = context;
    const weekStart = data.weekStart;
    const end = endOfWeekUTC(new Date(`${weekStart}T00:00:00Z`));
    const weekEnd = toISODate(end);
    const goals = await getOrCreateGoals(supabase, userId);

    const currentStart = toISODate(startOfWeekUTC());
    const isCurrent = weekStart === currentStart;

    if (!isCurrent) {
      const { data: snap } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (snap) {
        return {
          weekStart: snap.week_start,
          weekEnd: snap.week_end,
          overallScore: snap.overall_score,
          consistencyScore: snap.consistency_score,
          workoutsCompleted: snap.workouts_completed,
          plannedWorkouts: snap.planned_workouts,
          totalSets: snap.total_sets,
          totalReps: snap.total_reps,
          totalVolumeKg: Number(snap.total_volume_kg),
          averageCalories: snap.average_calories,
          averageProteinG: snap.average_protein_g,
          proteinHitDays: snap.protein_hit_days,
          calorieAdherence: snap.calorie_adherence,
          startingWeightKg: snap.starting_weight_kg === null ? null : Number(snap.starting_weight_kg),
          endingWeightKg: snap.ending_weight_kg === null ? null : Number(snap.ending_weight_kg),
          weightChangeKg: snap.weight_change_kg === null ? null : Number(snap.weight_change_kg),
          topMuscleGroups: ((snap.top_muscle_groups ?? []) as string[]).map((n) => ({ name: n, count: 0 })),
          aiSummary: snap.ai_summary ?? "",
          achievements: (snap.achievements ?? []) as { id: string; label: string; icon: string }[],
          nextWeekPlan: (snap.next_week_plan ?? {}) as WeeklyReportDTO["nextWeekPlan"],
          isFinalized: snap.is_finalized,
          perDay: [],
          prs: [],
          missedWorkouts: Math.max(0, snap.planned_workouts - snap.workouts_completed),
        };
      }
    }

    return computeReport(supabase, userId, weekStart, weekEnd, goals);
  });

export const listWeeklyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("weekly_reports")
      .select("week_start,week_end,overall_score,consistency_score,workouts_completed,planned_workouts,average_protein_g,protein_hit_days,weight_change_kg,is_finalized")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

async function generateAiText(
  stats: WeeklyReportDTO,
  goals: UserGoals,
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return fallbackSummary(stats);
  try {
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");
    const system = `You are a supportive, realistic fitness coach writing a short weekly recap.
RULES:
- 4-6 sentences total.
- Encouraging and honest. No shaming. No medical claims.
- Mention what went well, what held them back, and one concrete focus for next week.
- Use the user's actual numbers when relevant. Be specific, not generic.
- Plain text only, no markdown, no headings.`;
    const user = `Week ${stats.weekStart} → ${stats.weekEnd}
Workouts: ${stats.workoutsCompleted}/${stats.plannedWorkouts}
Total volume: ${stats.totalVolumeKg} kg, sets: ${stats.totalSets}, reps: ${stats.totalReps}
Avg calories: ${stats.averageCalories}/${goals.daily_calorie_target} kcal (adherence ${stats.calorieAdherence}%)
Avg protein: ${stats.averageProteinG}g (goal ${goals.daily_protein_g_target}g), hit on ${stats.proteinHitDays}/7 days
Weight: ${stats.startingWeightKg ?? "—"} → ${stats.endingWeightKg ?? "—"} kg (change ${stats.weightChangeKg ?? "—"})
Consistency score: ${stats.consistencyScore}/100
Top muscle groups: ${stats.topMuscleGroups.map((m) => m.name).join(", ") || "—"}
PRs: ${stats.prs.map((p) => p.name).join(", ") || "none"}`;
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = result.text?.trim();
    return text && text.length > 10 ? text : fallbackSummary(stats);
  } catch {
    return fallbackSummary(stats);
  }
}

function fallbackSummary(s: WeeklyReportDTO): string {
  const parts: string[] = [];
  parts.push(
    s.workoutsCompleted >= s.plannedWorkouts
      ? `Strong week — you hit ${s.workoutsCompleted}/${s.plannedWorkouts} workouts.`
      : `You completed ${s.workoutsCompleted}/${s.plannedWorkouts} workouts this week.`,
  );
  if (s.proteinHitDays >= 5) parts.push(`Protein was on point ${s.proteinHitDays}/7 days.`);
  else if (s.proteinHitDays > 0) parts.push(`Protein goal hit ${s.proteinHitDays}/7 days — room to push higher.`);
  if (s.weightChangeKg !== null) parts.push(`Weight changed ${s.weightChangeKg > 0 ? "+" : ""}${s.weightChangeKg} kg.`);
  parts.push(
    s.missedWorkouts > 0
      ? `Next week, focus on closing the gap on missed sessions and logging meals every day.`
      : `Next week, keep the streak alive and consider adding a cardio or recovery day.`,
  );
  return parts.join(" ");
}

export const finalizeWeeklyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { weekStart?: string }) => z.object({ weekStart: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Default: last week
    const start =
      data.weekStart
        ? new Date(`${data.weekStart}T00:00:00Z`)
        : (() => {
            const s = startOfWeekUTC();
            s.setUTCDate(s.getUTCDate() - 7);
            return s;
          })();
    const end = endOfWeekUTC(start);
    const weekStart = toISODate(start);
    const weekEnd = toISODate(end);
    const goals = await getOrCreateGoals(supabase, userId);
    const report = await computeReport(supabase, userId, weekStart, weekEnd, goals);
    const aiSummary = await generateAiText(report, goals);
    report.aiSummary = aiSummary;
    report.isFinalized = true;

    await supabase
      .from("weekly_reports")
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          week_end: weekEnd,
          overall_score: report.overallScore,
          consistency_score: report.consistencyScore,
          workouts_completed: report.workoutsCompleted,
          planned_workouts: report.plannedWorkouts,
          total_sets: report.totalSets,
          total_reps: report.totalReps,
          total_volume_kg: report.totalVolumeKg,
          average_calories: report.averageCalories,
          average_protein_g: report.averageProteinG,
          protein_hit_days: report.proteinHitDays,
          calorie_adherence: report.calorieAdherence,
          starting_weight_kg: report.startingWeightKg,
          ending_weight_kg: report.endingWeightKg,
          weight_change_kg: report.weightChangeKg,
          top_muscle_groups: report.topMuscleGroups.map((m) => m.name),
          ai_summary: aiSummary,
          achievements: report.achievements,
          next_week_plan: report.nextWeekPlan,
          is_finalized: true,
          finalized_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" },
      );

    // Notification
    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "weekly_report",
      title: "Your weekly fitness report is ready",
      body: `${report.workoutsCompleted} workouts • score ${report.overallScore}/100`,
      link_to: `/report/${weekStart}`,
    });

    return report;
  });

// ----- Quick log functions -----

export const upsertUserGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        weekly_workout_target: z.number().int().min(1).max(14).optional(),
        daily_calorie_target: z.number().int().min(500).max(8000).optional(),
        daily_protein_g_target: z.number().int().min(20).max(500).optional(),
        daily_step_target: z.number().int().min(1000).max(50000).optional(),
        goal_weight_kg: z.number().nullable().optional(),
        starting_weight_kg: z.number().nullable().optional(),
        timezone: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_goals")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUserGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getOrCreateGoals(context.supabase, context.userId));

export const quickLogWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1),
        performed_on: z.string().optional(),
        duration_min: z.number().int().min(0).default(0),
        total_sets: z.number().int().min(0).default(0),
        total_reps: z.number().int().min(0).default(0),
        total_volume_kg: z.number().min(0).default(0),
        muscle_groups: z.array(z.string()).default([]),
        is_pr: z.boolean().default(false),
        pr_note: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("workout_logs").insert({
      user_id: userId,
      name: data.name,
      performed_on: data.performed_on ?? toISODate(new Date()),
      duration_min: data.duration_min,
      total_sets: data.total_sets,
      total_reps: data.total_reps,
      total_volume_kg: data.total_volume_kg,
      muscle_groups: data.muscle_groups,
      is_pr: data.is_pr,
      pr_note: data.pr_note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const quickLogMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1),
        meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
        logged_on: z.string().optional(),
        calories: z.number().int().min(0).default(0),
        protein_g: z.number().min(0).default(0),
        carbs_g: z.number().min(0).default(0),
        fat_g: z.number().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("food_logs").insert({
      user_id: userId,
      name: data.name,
      meal: data.meal,
      logged_on: data.logged_on ?? toISODate(new Date()),
      calories: data.calories,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const quickLogWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ weight_kg: z.number().min(20).max(500), logged_on: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("weight_logs").upsert(
      {
        user_id: userId,
        weight_kg: data.weight_kg,
        logged_on: data.logged_on ?? toISODate(new Date()),
      },
      { onConflict: "user_id,logged_on" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const quickLogActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        activity_on: z.string().optional(),
        steps: z.number().int().min(0).default(0),
        sleep_hours: z.number().min(0).max(24).default(0),
        recovery_score: z.number().int().min(0).max(100).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("daily_activity").upsert(
      {
        user_id: userId,
        activity_on: data.activity_on ?? toISODate(new Date()),
        steps: data.steps,
        sleep_hours: data.sleep_hours,
        recovery_score: data.recovery_score,
      },
      { onConflict: "user_id,activity_on" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Notifications -----

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("id,kind,title,body,link_to,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { ok: true };
  });
