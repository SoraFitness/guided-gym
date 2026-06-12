-- Weekly Reports schema: logging tables + reports + notifications + user goals.

-- 1) workout_logs
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  performed_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  name text NOT NULL,
  duration_min integer NOT NULL DEFAULT 0,
  total_sets integer NOT NULL DEFAULT 0,
  total_reps integer NOT NULL DEFAULT 0,
  total_volume_kg numeric NOT NULL DEFAULT 0,
  muscle_groups text[] NOT NULL DEFAULT '{}',
  is_pr boolean NOT NULL DEFAULT false,
  pr_note text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout logs" ON public.workout_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX workout_logs_user_date_idx ON public.workout_logs (user_id, performed_on DESC);

-- 2) food_logs
CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  meal text NOT NULL DEFAULT 'snack',
  name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (meal IN ('breakfast','lunch','dinner','snack'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs TO authenticated;
GRANT ALL ON public.food_logs TO service_role;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food logs" ON public.food_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX food_logs_user_date_idx ON public.food_logs (user_id, logged_on DESC);

-- 3) weight_logs
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  weight_kg numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight logs" ON public.weight_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) daily_activity
CREATE TABLE public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  steps integer NOT NULL DEFAULT 0,
  sleep_hours numeric NOT NULL DEFAULT 0,
  recovery_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_on),
  CHECK (recovery_score >= 0 AND recovery_score <= 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily activity" ON public.daily_activity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) user_goals
CREATE TABLE public.user_goals (
  user_id uuid PRIMARY KEY,
  timezone text NOT NULL DEFAULT 'UTC',
  weekly_workout_target integer NOT NULL DEFAULT 4,
  daily_calorie_target integer NOT NULL DEFAULT 2200,
  daily_protein_g_target integer NOT NULL DEFAULT 140,
  daily_step_target integer NOT NULL DEFAULT 8000,
  goal_weight_kg numeric,
  starting_weight_kg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user goals" ON public.user_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6) weekly_reports
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  overall_score integer NOT NULL DEFAULT 0,
  consistency_score integer NOT NULL DEFAULT 0,
  workouts_completed integer NOT NULL DEFAULT 0,
  planned_workouts integer NOT NULL DEFAULT 0,
  total_sets integer NOT NULL DEFAULT 0,
  total_reps integer NOT NULL DEFAULT 0,
  total_volume_kg numeric NOT NULL DEFAULT 0,
  average_calories integer NOT NULL DEFAULT 0,
  average_protein_g integer NOT NULL DEFAULT 0,
  protein_hit_days integer NOT NULL DEFAULT 0,
  calorie_adherence integer NOT NULL DEFAULT 0,
  starting_weight_kg numeric,
  ending_weight_kg numeric,
  weight_change_kg numeric,
  top_muscle_groups text[] NOT NULL DEFAULT '{}',
  ai_summary text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_week_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_finalized boolean NOT NULL DEFAULT false,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly reports" ON public.weekly_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7) notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'reminder',
  title text NOT NULL,
  body text,
  link_to text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('weekly_report','achievement','reminder'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_workout_logs BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_user_goals BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_weekly_reports BEFORE UPDATE ON public.weekly_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
