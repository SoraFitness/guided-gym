## Weekly Fitness Reports

A Spotify-Wrapped-style weekly recap covering workouts, nutrition, body progress, consistency, AI insights, next-week plan, and badges. All users get the full experience (no premium gating). Reports finalize automatically Sunday evening; the current week is viewable live anytime.

### 1. Database (one migration)

New tables, all with RLS scoped to `auth.uid()` and full GRANTs:

- `workout_logs` — `user_id`, `performed_on` (date), `name`, `duration_min`, `total_sets`, `total_reps`, `total_volume_kg`, `muscle_groups` (text[]), `is_pr` (bool), `pr_note` (text), `notes`.
- `food_logs` — `user_id`, `logged_on` (date), `meal` ('breakfast'|'lunch'|'dinner'|'snack'), `name`, `calories`, `protein_g`, `carbs_g`, `fat_g`.
- `weight_logs` — `user_id`, `logged_on` (date), `weight_kg`. Unique `(user_id, logged_on)`.
- `daily_activity` — `user_id`, `activity_on` (date), `steps`, `sleep_hours`, `recovery_score` (0–100). Unique `(user_id, activity_on)`.
- `user_goals` — `user_id` (unique), `weekly_workout_target` (default 4), `daily_calorie_target`, `daily_protein_g_target`, `daily_step_target` (default 8000), `goal_weight_kg`, `starting_weight_kg`.
- `weekly_reports` — snapshot per `(user_id, week_start)` (unique). Columns: `week_start` date, `week_end` date, `overall_score`, `consistency_score`, `workouts_completed`, `planned_workouts`, `total_sets`, `total_reps`, `total_volume_kg`, `average_calories`, `average_protein_g`, `protein_hit_days`, `calorie_adherence`, `starting_weight_kg`, `ending_weight_kg`, `weight_change_kg`, `top_muscle_groups` (text[]), `ai_summary` (text), `achievements` (jsonb), `next_week_plan` (jsonb), `is_finalized` (bool), `finalized_at`.
- `notifications` — `user_id`, `kind` ('weekly_report'|'achievement'|'reminder'), `title`, `body`, `link_to` (text), `read_at`, `created_at`. RLS: own rows only.

Week boundary: Monday 00:00 → Sunday 23:59 in user's local timezone (stored in `user_goals.timezone`, default `'UTC'`).

### 2. Server functions (`src/lib/weeklyReport.functions.ts`)

All use `requireSupabaseAuth`.

- `computeCurrentWeekReport()` — live aggregation for the in-progress week, returns full DTO without persisting.
- `getWeeklyReport({ weekStart })` — returns persisted snapshot, or live-computes if it's the current week.
- `listWeeklyReports()` — list of past reports (week range, score, workouts, weight change, protein hit rate).
- `finalizeWeeklyReport({ weekStart })` — computes + persists snapshot + generates AI summary + writes notification + grants achievements. Idempotent.
- `generateAiInsights({ stats })` — calls Lovable AI (`google/gemini-3-flash-preview`) with structured `Output.object` schema returning `{ summary, wentWell, heldBack, focus, actionPlan, nextWeekPlan }`. Strict system prompt: encouraging, no medical claims, no shaming.
- Notifications: `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
- Quick-log helpers (used by simple "Log workout / Log meal / Log weight" sheets so data actually flows in): `quickLogWorkout`, `quickLogMeal`, `quickLogWeight`, `quickLogActivity`, `upsertUserGoals`.

### 3. Consistency score

Computed in TypeScript from real rows (no hardcoded values), per spec formula:
```
workoutCompletionRate * 0.30 + nutritionLoggingRate * 0.20 +
proteinHitRate * 0.20 + calorieAdherenceRate * 0.15 +
activityCompletionRate * 0.10 + recoveryScore * 0.05
```
Each component is 0–1, clamped. Overall score = consistency score (rounded).

### 4. Achievements

Evaluated at finalize-time against the week's stats:
- First week completed, 3 / 5 workouts in a week, protein goal 5 days, 7-day food logging streak, new PR (any `is_pr=true` row), weight-goal milestone (10/25/50/100% to goal), progress photo uploaded this week.
Stored on the report as `achievements: [{ id, label, icon }]`.

### 5. Cron (Sunday 22:00 UTC)

Public route `src/routes/api/public/hooks/finalize-weekly-reports.ts` (apikey-header auth). Iterates users who have any logged activity in the past week and calls finalize for each. Scheduled via `pg_cron` + `pg_net` using the apikey pattern.

### 6. Routes & UI

- `src/routes/_app.report.index.tsx` — current week report. Sections: Summary card (date range, overall score ring, AI summary, achievement/improve), Workouts, Nutrition, Body Progress, Consistency Score (radial + breakdown bars), AI Insights, Next Week Plan, Achievements grid. Empty state: "Log workouts and meals this week to generate your first weekly report."
- `src/routes/_app.report.history.tsx` — list of past finalized reports.
- `src/routes/_app.report.$weekStart.tsx` — historical report detail.
- `src/routes/_app.notifications.tsx` — notification center.

### 7. Entry points

- Home (`_app.home.tsx`): "Your Weekly Report" card — shows score + "View this week's report" if data exists, otherwise "Weekly report builds as you log workouts and meals."
- Progress (`_app.progress.tsx`): Weekly Report row + History link.
- Profile (`_app.profile.tsx`): Weekly Report row + Notification settings.
- Coach (`_app.coach.tsx`): "View weekly report" suggestion chip.
- New "Weekly Report" item in bottom-nav overflow / inside Progress (avoid crowding the existing 5-tab nav).
- Notification bell icon in `_app.tsx` top bar with unread badge → `/notifications`.

### 8. Quick-log UI (minimal, so the report has real data)

Simple sheets reachable from Home "+" FAB:
- Log workout (name, duration, sets, reps, volume, muscle groups chips, "Mark PR")
- Log meal (name, meal type, calories, protein, carbs, fat)
- Log weight (single number)
- Log steps/sleep (daily)
- Set goals (calorie/protein/step/workout targets, timezone, goal weight)

These are intentionally lightweight — just enough for the report to be real, not a full nutrition/workout tracker overhaul.

### 9. AI prompt

System: "You are a supportive fitness coach. Use the user's real weekly stats. Be encouraging and realistic. No medical claims. No shaming. Give one concrete action plan." User payload: JSON of week stats + goals + recent progress photos count + weight trend. Returns structured JSON via AI SDK `Output.object`.

### 10. Design

Reuse existing dark theme + neon-green accents, `rounded-2xl` cards, shadcn primitives, lucide icons, mobile-first. Score ring uses an SVG circular progress. Charts: simple inline bars (no chart library needed for v1).

### Out of scope (v1)

- Push/email notifications (in-app only)
- Premium gating
- Body-scan integration (already separate)
- Editing past reports

### Technical notes

- Week boundaries computed server-side from `user_goals.timezone`.
- Finalize is idempotent via unique `(user_id, week_start)`.
- Current-week view always live-computes; never reads stale snapshot for the active week.
- AI errors degrade gracefully: report renders with a fallback summary if AI call fails.
