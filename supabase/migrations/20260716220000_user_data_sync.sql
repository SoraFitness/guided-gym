-- Full per-account persistence:
--   * detailed workout sessions (per-exercise sets/reps/weights) on workout_logs
--   * round-trip food log entries on food_logs
--   * carb/fat macro targets on user_goals
--   * body_scans table
--   * coach_user_memory table (long-term AI coach memory)
--   * user_app_state key/value table (recent foods, favorites, unit preference, streak log)
--   * progress-photos storage bucket (policies already exist from an earlier migration)

-- 1) Detailed workout session payload
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS session jsonb,
  ADD COLUMN IF NOT EXISTS calories integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'lb',
  ADD COLUMN IF NOT EXISTS workout_id text;

-- 2) Round-trip food log entries (exact client entry incl. servings/preset id)
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS entry jsonb,
  ADD COLUMN IF NOT EXISTS logged_at timestamptz;

-- 3) Carb/fat targets alongside existing calorie/protein targets
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS daily_carbs_g_target integer NOT NULL DEFAULT 230,
  ADD COLUMN IF NOT EXISTS daily_fat_g_target integer NOT NULL DEFAULT 70;

-- 4) Body scans
CREATE TABLE IF NOT EXISTS public.body_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_scans TO authenticated;
GRANT ALL ON public.body_scans TO service_role;
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own body scans" ON public.body_scans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS body_scans_user_created_idx ON public.body_scans (user_id, created_at DESC);

-- 5) Coach long-term memory (durable facts the AI coach saves across sessions)
CREATE TABLE IF NOT EXISTS public.coach_user_memory (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memories jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_user_memory TO authenticated;
GRANT ALL ON public.coach_user_memory TO service_role;
ALTER TABLE public.coach_user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach memory" ON public.coach_user_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_coach_user_memory BEFORE UPDATE ON public.coach_user_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6) Misc synced app state (small key/value blobs: recent foods, favorites,
--    weight-unit preference, workout minutes/streak log)
CREATE TABLE IF NOT EXISTS public.user_app_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_state TO authenticated;
GRANT ALL ON public.user_app_state TO service_role;
ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own app state" ON public.user_app_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER touch_user_app_state BEFORE UPDATE ON public.user_app_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7) Storage bucket for progress photos (the RLS policies for it were created
--    in 20260612223915; on a fresh project the bucket itself must exist too)
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;
