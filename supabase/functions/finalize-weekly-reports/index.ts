import { createAdminClient } from "../_shared/auth.ts";
import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";
import { optionalEnv, requiredEnv } from "../_shared/env.ts";

type Goals = {
  weekly_workout_target: number;
  daily_calorie_target: number;
  daily_protein_g_target: number;
  daily_step_target: number;
};

const defaults: Goals = {
  weekly_workout_target: 4,
  daily_calorie_target: 2200,
  daily_protein_g_target: 140,
  daily_step_target: 8000,
};

function startOfWeekUTC(reference: Date) {
  const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function secretsMatch(provided: string, expected: string) {
  const length = Math.max(provided.length, expected.length);
  let mismatch = provided.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (provided.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function fallbackSummary(workouts: number, goals: Goals, proteinDays: number) {
  return `You completed ${workouts}/${goals.weekly_workout_target} workouts and hit your protein goal ${proteinDays}/7 days. Keep building consistency next week.`;
}

async function generateSummary(input: {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  goals: Goals;
  averageCalories: number;
  proteinDays: number;
  weightChange: number | null;
  score: number;
}) {
  const lovableKey = optionalEnv("LOVABLE_API_KEY");
  const openRouterKey = optionalEnv("OPENROUTER_API_KEY");
  if (!lovableKey && !openRouterKey) {
    return fallbackSummary(input.workouts, input.goals, input.proteinDays);
  }
  const upstreamUrl = lovableKey
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const headers: Record<string, string> = lovableKey
    ? { "Content-Type": "application/json", "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }
    : { "Content-Type": "application/json", Authorization: `Bearer ${openRouterKey}`, "X-Title": "Ascendr Weekly Report" };
  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: "You are a supportive, realistic fitness coach. 4-6 sentences. No medical claims. No shaming. Plain text.",
          },
          {
            role: "user",
            content: `Week ${input.weekStart}-${input.weekEnd}. Workouts ${input.workouts}/${input.goals.weekly_workout_target}. Avg cal ${input.averageCalories}/${input.goals.daily_calorie_target}. Protein hit ${input.proteinDays}/7. Weight change ${input.weightChange ?? "n/a"} kg. Consistency ${input.score}/100. Write a recap and one focus for next week.`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI returned ${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const summary = payload.choices?.[0]?.message?.content?.trim();
    return summary || fallbackSummary(input.workouts, input.goals, input.proteinDays);
  } catch (error) {
    console.error("[weekly-finalizer] AI summary failed", error);
    return fallbackSummary(input.workouts, input.goals, input.proteinDays);
  }
}

async function finalizeForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  weekStart: string,
  weekEnd: string,
) {
  const { data: storedGoals } = await admin.from("user_goals").select("*").eq("user_id", userId).maybeSingle();
  const goals: Goals = {
    weekly_workout_target: Number(storedGoals?.weekly_workout_target ?? defaults.weekly_workout_target),
    daily_calorie_target: Number(storedGoals?.daily_calorie_target ?? defaults.daily_calorie_target),
    daily_protein_g_target: Number(storedGoals?.daily_protein_g_target ?? defaults.daily_protein_g_target),
    daily_step_target: Number(storedGoals?.daily_step_target ?? defaults.daily_step_target),
  };
  const [workouts, foods, weights, activity] = await Promise.all([
    admin.from("workout_logs").select("name,total_sets,total_reps,total_volume_kg,muscle_groups,is_pr,pr_note").eq("user_id", userId).gte("performed_on", weekStart).lte("performed_on", weekEnd),
    admin.from("food_logs").select("logged_on,calories,protein_g").eq("user_id", userId).gte("logged_on", weekStart).lte("logged_on", weekEnd),
    admin.from("weight_logs").select("logged_on,weight_kg").eq("user_id", userId).gte("logged_on", weekStart).lte("logged_on", weekEnd).order("logged_on", { ascending: true }),
    admin.from("daily_activity").select("activity_on,steps,recovery_score").eq("user_id", userId).gte("activity_on", weekStart).lte("activity_on", weekEnd),
  ]);
  const workoutRows = workouts.data ?? [];
  const foodRows = foods.data ?? [];
  const weightRows = weights.data ?? [];
  const activityRows = activity.data ?? [];
  const workoutsCompleted = workoutRows.length;
  const totalSets = workoutRows.reduce((sum, row) => sum + Number(row.total_sets ?? 0), 0);
  const totalReps = workoutRows.reduce((sum, row) => sum + Number(row.total_reps ?? 0), 0);
  const totalVolumeKg = Number(workoutRows.reduce((sum, row) => sum + Number(row.total_volume_kg ?? 0), 0).toFixed(1));
  const muscleCounts = new Map<string, number>();
  for (const row of workoutRows) {
    for (const muscle of row.muscle_groups ?? []) muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1);
  }
  const topMuscles = [...muscleCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5).map(([name]) => name);
  const personalRecords = workoutRows.filter((row) => row.is_pr).map((row) => ({ name: row.name, note: row.pr_note }));
  const caloriesByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const row of foodRows) {
    caloriesByDay.set(row.logged_on, (caloriesByDay.get(row.logged_on) ?? 0) + Number(row.calories ?? 0));
    proteinByDay.set(row.logged_on, (proteinByDay.get(row.logged_on) ?? 0) + Number(row.protein_g ?? 0));
  }
  const loggedDays = caloriesByDay.size;
  const averageCalories = loggedDays
    ? Math.round([...caloriesByDay.values()].reduce((sum, value) => sum + value, 0) / loggedDays)
    : 0;
  const averageProtein = loggedDays
    ? Math.round([...proteinByDay.values()].reduce((sum, value) => sum + value, 0) / loggedDays)
    : 0;
  const proteinDays = [...proteinByDay.values()].filter((value) => value >= goals.daily_protein_g_target).length;
  const adherenceValues = [...caloriesByDay.values()].map((value) =>
    Math.max(0, 1 - Math.abs(value - goals.daily_calorie_target) / Math.max(1, goals.daily_calorie_target)),
  );
  const calorieAdherence = adherenceValues.length
    ? Math.round((adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length) * 100)
    : 0;
  const startingWeight = weightRows.length ? Number(weightRows[0].weight_kg) : null;
  const endingWeight = weightRows.length ? Number(weightRows[weightRows.length - 1].weight_kg) : null;
  const weightChange = startingWeight !== null && endingWeight !== null
    ? Number((endingWeight - startingWeight).toFixed(1))
    : null;
  const steps = new Map<string, number>();
  const recovery: number[] = [];
  for (const row of activityRows) {
    steps.set(row.activity_on, Number(row.steps ?? 0));
    if (row.recovery_score) recovery.push(Number(row.recovery_score));
  }
  const activityDays = [...steps.values()].filter((value) => value >= goals.daily_step_target).length;
  const consistencyScore = Math.round((
    Math.min(1, workoutsCompleted / Math.max(1, goals.weekly_workout_target)) * 0.3 +
    Math.min(1, loggedDays / 7) * 0.2 +
    Math.min(1, proteinDays / 7) * 0.2 +
    (calorieAdherence / 100) * 0.15 +
    Math.min(1, activityDays / 7) * 0.1 +
    (recovery.length ? Math.min(1, recovery.reduce((sum, value) => sum + value, 0) / recovery.length / 100) : 0) * 0.05
  ) * 100);
  const achievements = [{ id: "week_done", label: "Week completed", icon: "trophy" }];
  if (workoutsCompleted >= 3) achievements.push({ id: "w3", label: "3 workouts this week", icon: "dumbbell" });
  if (workoutsCompleted >= 5) achievements.push({ id: "w5", label: "5 workouts this week", icon: "flame" });
  if (proteinDays >= 5) achievements.push({ id: "p5", label: "Protein goal hit 5+ days", icon: "drumstick" });
  if (loggedDays >= 7) achievements.push({ id: "log7", label: "7-day food logging streak", icon: "notebook" });
  if (personalRecords.length > 0) achievements.push({ id: "pr", label: `New PR - ${personalRecords[0].name}`, icon: "medal" });
  const aiSummary = await generateSummary({ weekStart, weekEnd, workouts: workoutsCompleted, goals, averageCalories, proteinDays, weightChange, score: consistencyScore });
  const nextWeekPlan = { workouts: Math.min(6, Math.max(goals.weekly_workout_target, workoutsCompleted + 1)), proteinDays: Math.min(7, Math.max(5, proteinDays + 1)), logDays: 7, cardio: workoutsCompleted >= goals.weekly_workout_target ? 2 : 1, photos: 1, notes: "" };
  const { error: reportError } = await admin.from("weekly_reports").upsert({
    user_id: userId, week_start: weekStart, week_end: weekEnd, overall_score: consistencyScore,
    consistency_score: consistencyScore, workouts_completed: workoutsCompleted, planned_workouts: goals.weekly_workout_target,
    total_sets: totalSets, total_reps: totalReps, total_volume_kg: totalVolumeKg, average_calories: averageCalories,
    average_protein_g: averageProtein, protein_hit_days: proteinDays, calorie_adherence: calorieAdherence,
    starting_weight_kg: startingWeight, ending_weight_kg: endingWeight, weight_change_kg: weightChange,
    top_muscle_groups: topMuscles, ai_summary: aiSummary, achievements, next_week_plan: nextWeekPlan,
    is_finalized: true, finalized_at: new Date().toISOString(),
  }, { onConflict: "user_id,week_start" });
  if (reportError) throw reportError;
  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: userId, kind: "weekly_report", title: "Your weekly fitness report is ready",
    body: `${workoutsCompleted} workouts - score ${consistencyScore}/100`, link_to: `/report/${weekStart}`,
  });
  if (notificationError) throw notificationError;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret");
  if (!provided || !secretsMatch(provided, requiredEnv("CRON_SECRET"))) return jsonResponse({ error: "Unauthorized" }, 401);
  try {
    const admin = createAdminClient();
    const thisWeekStart = startOfWeekUTC(new Date());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 6);
    const weekStart = toIsoDate(lastWeekStart);
    const weekEnd = toIsoDate(lastWeekEnd);
    const activity = await Promise.all([
      admin.from("workout_logs").select("user_id").gte("performed_on", weekStart).lte("performed_on", weekEnd),
      admin.from("food_logs").select("user_id").gte("logged_on", weekStart).lte("logged_on", weekEnd),
      admin.from("weight_logs").select("user_id").gte("logged_on", weekStart).lte("logged_on", weekEnd),
      admin.from("daily_activity").select("user_id").gte("activity_on", weekStart).lte("activity_on", weekEnd),
    ]);
    const userIds = new Set(activity.flatMap((result) => (result.data ?? []).map((row) => row.user_id).filter(Boolean)));
    const results = await Promise.all([...userIds].map(async (userId) => {
      try {
        await finalizeForUser(admin, userId as string, weekStart, weekEnd);
        return { ok: true };
      } catch (error) {
        console.error("[weekly-finalizer] user failed", userId, error);
        return { ok: false };
      }
    }));
    return jsonResponse({ processed: results.length, succeeded: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length, weekStart });
  } catch (error) {
    console.error("[weekly-finalizer] failed", error);
    return jsonResponse({ error: "Weekly report finalization failed" }, 500);
  }
});
