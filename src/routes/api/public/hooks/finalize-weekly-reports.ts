import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

// Sunday-evening cron: finalize last week's report for every user that logged
// any activity in the past week. Idempotent via unique (user_id, week_start).

function startOfWeekUTC(ref: Date): Date {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
function toISO(d: Date) { return d.toISOString().slice(0, 10); }

export const Route = createFileRoute("/api/public/hooks/finalize-weekly-reports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env.SUPABASE_URL;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!url || !anon || !provided || provided !== anon) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Last week range
        const thisWeekStart = startOfWeekUTC(new Date());
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 6);
        const wsISO = toISO(lastWeekStart);
        const weISO = toISO(lastWeekEnd);

        // Active users in past week
        const [w, f, wt, a] = await Promise.all([
          supabaseAdmin.from("workout_logs").select("user_id").gte("performed_on", wsISO).lte("performed_on", weISO),
          supabaseAdmin.from("food_logs").select("user_id").gte("logged_on", wsISO).lte("logged_on", weISO),
          supabaseAdmin.from("weight_logs").select("user_id").gte("logged_on", wsISO).lte("logged_on", weISO),
          supabaseAdmin.from("daily_activity").select("user_id").gte("activity_on", wsISO).lte("activity_on", weISO),
        ]);
        const userIds = new Set<string>();
        for (const r of [...(w.data ?? []), ...(f.data ?? []), ...(wt.data ?? []), ...(a.data ?? [])]) {
          if (r.user_id) userIds.add(r.user_id as string);
        }

        const results: { userId: string; ok: boolean; error?: string }[] = [];
        for (const userId of userIds) {
          try {
            await finalizeForUser(supabaseAdmin, userId, wsISO, weISO);
            results.push({ userId, ok: true });
          } catch (e) {
            results.push({ userId, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return Response.json({ processed: results.length, results, weekStart: wsISO });
      },
    },
  },
});

interface Goals {
  weekly_workout_target: number; daily_calorie_target: number;
  daily_protein_g_target: number; daily_step_target: number;
  goal_weight_kg: number | null; starting_weight_kg: number | null;
}
const DEF: Goals = { weekly_workout_target: 4, daily_calorie_target: 2200, daily_protein_g_target: 140, daily_step_target: 8000, goal_weight_kg: null, starting_weight_kg: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalizeForUser(supa: any, userId: string, weekStart: string, weekEnd: string) {
  const { data: g } = await supa.from("user_goals").select("*").eq("user_id", userId).maybeSingle();
  const goals: Goals = g ? {
    weekly_workout_target: Number(g.weekly_workout_target ?? DEF.weekly_workout_target),
    daily_calorie_target: Number(g.daily_calorie_target ?? DEF.daily_calorie_target),
    daily_protein_g_target: Number(g.daily_protein_g_target ?? DEF.daily_protein_g_target),
    daily_step_target: Number(g.daily_step_target ?? DEF.daily_step_target),
    goal_weight_kg: g.goal_weight_kg !== null && g.goal_weight_kg !== undefined ? Number(g.goal_weight_kg) : null,
    starting_weight_kg: g.starting_weight_kg !== null && g.starting_weight_kg !== undefined ? Number(g.starting_weight_kg) : null,
  } : { ...DEF };

  const [wk, fd, wt, ac] = await Promise.all([
    supa.from("workout_logs").select("name,performed_on,total_sets,total_reps,total_volume_kg,muscle_groups,is_pr,pr_note").eq("user_id", userId).gte("performed_on", weekStart).lte("performed_on", weekEnd),
    supa.from("food_logs").select("logged_on,calories,protein_g").eq("user_id", userId).gte("logged_on", weekStart).lte("logged_on", weekEnd),
    supa.from("weight_logs").select("logged_on,weight_kg").eq("user_id", userId).gte("logged_on", weekStart).lte("logged_on", weekEnd).order("logged_on", { ascending: true }),
    supa.from("daily_activity").select("activity_on,steps,recovery_score").eq("user_id", userId).gte("activity_on", weekStart).lte("activity_on", weekEnd),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wkRows = (wk.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fdRows = (fd.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wtRows = (wt.data ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acRows = (ac.data ?? []) as any[];

  const workoutsCompleted = wkRows.length;
  const totalSets = wkRows.reduce((s, r) => s + Number(r.total_sets ?? 0), 0);
  const totalReps = wkRows.reduce((s, r) => s + Number(r.total_reps ?? 0), 0);
  const totalVolumeKg = +wkRows.reduce((s, r) => s + Number(r.total_volume_kg ?? 0), 0).toFixed(1);
  const muscleCounts = new Map<string, number>();
  for (const r of wkRows) for (const m of (r.muscle_groups ?? [])) muscleCounts.set(m, (muscleCounts.get(m) ?? 0) + 1);
  const topMuscle = [...muscleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
  const prs = wkRows.filter((r) => r.is_pr).map((r) => ({ name: r.name, note: r.pr_note }));

  const calByDay = new Map<string, number>(); const proByDay = new Map<string, number>();
  for (const f of fdRows) {
    calByDay.set(f.logged_on, (calByDay.get(f.logged_on) ?? 0) + Number(f.calories ?? 0));
    proByDay.set(f.logged_on, (proByDay.get(f.logged_on) ?? 0) + Number(f.protein_g ?? 0));
  }
  const loggedDays = calByDay.size;
  const calVals = [...calByDay.values()];
  const averageCalories = calVals.length ? Math.round(calVals.reduce((s, v) => s + v, 0) / calVals.length) : 0;
  const averageProteinG = loggedDays ? Math.round([...proByDay.values()].reduce((s, v) => s + v, 0) / loggedDays) : 0;
  const proteinHitDays = [...proByDay.values()].filter((g) => g >= goals.daily_protein_g_target).length;
  const calTarget = goals.daily_calorie_target || 1;
  const adVals = calVals.map((c) => Math.max(0, 1 - Math.abs(c - calTarget) / calTarget));
  const calorieAdherence = adVals.length ? Math.round(adVals.reduce((s, v) => s + v, 0) / adVals.length * 100) : 0;

  const startingWeightKg = wtRows.length ? Number(wtRows[0].weight_kg) : null;
  const endingWeightKg = wtRows.length ? Number(wtRows[wtRows.length - 1].weight_kg) : null;
  const weightChangeKg = startingWeightKg !== null && endingWeightKg !== null ? +(endingWeightKg - startingWeightKg).toFixed(1) : null;

  const stepDays = new Map<string, number>(); const recScores: number[] = [];
  for (const a of acRows) { stepDays.set(a.activity_on, Number(a.steps ?? 0)); if (a.recovery_score) recScores.push(Number(a.recovery_score)); }
  const activityHitDays = [...stepDays.values()].filter((s) => s >= goals.daily_step_target).length;

  const consistencyScore = Math.round((
    Math.min(1, workoutsCompleted / (goals.weekly_workout_target || 1)) * 0.3 +
    Math.min(1, loggedDays / 7) * 0.2 +
    Math.min(1, proteinHitDays / 7) * 0.2 +
    (calorieAdherence / 100) * 0.15 +
    Math.min(1, activityHitDays / 7) * 0.1 +
    (recScores.length ? Math.min(1, recScores.reduce((s, v) => s + v, 0) / recScores.length / 100) : 0) * 0.05
  ) * 100);

  // Achievements
  const achievements: { id: string; label: string; icon: string }[] = [{ id: "week_done", label: "Week completed", icon: "trophy" }];
  if (workoutsCompleted >= 3) achievements.push({ id: "w3", label: "3 workouts this week", icon: "dumbbell" });
  if (workoutsCompleted >= 5) achievements.push({ id: "w5", label: "5 workouts this week", icon: "flame" });
  if (proteinHitDays >= 5) achievements.push({ id: "p5", label: "Protein goal hit 5+ days", icon: "drumstick" });
  if (loggedDays >= 7) achievements.push({ id: "log7", label: "7-day food logging streak", icon: "notebook" });
  if (prs.length > 0) achievements.push({ id: "pr", label: `New PR — ${prs[0].name}`, icon: "medal" });

  // AI summary
  let aiSummary = `You completed ${workoutsCompleted}/${goals.weekly_workout_target} workouts and hit your protein goal ${proteinHitDays}/7 days. Keep building consistency next week.`;
  try {
    const key = process.env.LOVABLE_API_KEY;
    if (key) {
      const gateway = createLovableAiGatewayProvider(key);
      const result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: "You are a supportive, realistic fitness coach. 4-6 sentences. No medical claims. No shaming. Plain text." },
          { role: "user", content: `Week ${weekStart}-${weekEnd}. Workouts ${workoutsCompleted}/${goals.weekly_workout_target}. Avg cal ${averageCalories}/${goals.daily_calorie_target}. Protein hit ${proteinHitDays}/7. Weight change ${weightChangeKg ?? "—"} kg. Consistency ${consistencyScore}/100. Write a recap and one focus for next week.` },
        ],
      });
      if (result.text?.trim()) aiSummary = result.text.trim();
    }
  } catch { /* keep fallback */ }

  const nextWeekPlan = {
    workouts: Math.min(6, Math.max(goals.weekly_workout_target, workoutsCompleted + 1)),
    proteinDays: Math.min(7, Math.max(5, proteinHitDays + 1)),
    logDays: 7,
    cardio: workoutsCompleted >= goals.weekly_workout_target ? 2 : 1,
    photos: 1,
    notes: "",
  };

  await supa.from("weekly_reports").upsert({
    user_id: userId, week_start: weekStart, week_end: weekEnd,
    overall_score: consistencyScore, consistency_score: consistencyScore,
    workouts_completed: workoutsCompleted, planned_workouts: goals.weekly_workout_target,
    total_sets: totalSets, total_reps: totalReps, total_volume_kg: totalVolumeKg,
    average_calories: averageCalories, average_protein_g: averageProteinG,
    protein_hit_days: proteinHitDays, calorie_adherence: calorieAdherence,
    starting_weight_kg: startingWeightKg, ending_weight_kg: endingWeightKg, weight_change_kg: weightChangeKg,
    top_muscle_groups: topMuscle, ai_summary: aiSummary, achievements, next_week_plan: nextWeekPlan,
    is_finalized: true, finalized_at: new Date().toISOString(),
  }, { onConflict: "user_id,week_start" });

  await supa.from("notifications").insert({
    user_id: userId,
    kind: "weekly_report",
    title: "Your weekly fitness report is ready",
    body: `${workoutsCompleted} workouts • score ${consistencyScore}/100`,
    link_to: `/report/${weekStart}`,
  });
}
