-- Security hardening
--   1. Every personal table is deleted together with its account.
--   2. Coach messages can only be attached to the member's own threads.
--   3. Progress-photo uploads are limited to images of up to 15 MB.
--   4. One active device per account: only the newest sign-in session can read or
--      write the member's data. Older sessions are rejected immediately.

-- 1) Cascade account deletion to tables that were created without a foreign key.
--    Rows whose account no longer exists are unreachable under RLS and are removed first.
DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'workout_logs',
    'food_logs',
    'weight_logs',
    'daily_activity',
    'user_goals',
    'weekly_reports',
    'notifications'
  ]
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I AS r WHERE NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = r.user_id)',
      target
    );
    IF NOT EXISTS (
      SELECT 1
        FROM pg_constraint
       WHERE conname = target || '_user_id_fkey'
         AND conrelid = format('public.%I', target)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
        target,
        target || '_user_id_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- 2) A message must belong to one of the member's own Coach threads.
DROP POLICY IF EXISTS "own messages" ON public.coach_messages;
CREATE POLICY "own messages" ON public.coach_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
        FROM public.coach_threads AS thread
       WHERE thread.id = coach_messages.thread_id
         AND thread.user_id = auth.uid()
    )
  );

-- 3) The app uploads JPEG photos; allow common image types only, up to 15 MB.
UPDATE storage.buckets
   SET file_size_limit = 15 * 1024 * 1024,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'progress-photos';

-- 4) One active device per account.
-- Fail the whole migration (it runs in one transaction) if session records aren't
-- readable, instead of installing a check that would lock every member out.
DO $$
BEGIN
  PERFORM 1 FROM auth.sessions LIMIT 1;
END $$;

-- True only when the caller's session still exists and no newer sign-in exists for
-- the same account. A friend signing in with shared credentials creates a newer
-- session, which immediately replaces the previous device.
CREATE OR REPLACE FUNCTION public.is_current_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT NOT EXISTS (
      SELECT 1
        FROM auth.sessions AS newer
       WHERE newer.user_id = current_session.user_id
         AND newer.created_at > current_session.created_at
    )
      FROM auth.sessions AS current_session
     WHERE current_session.id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid
       AND current_session.user_id = auth.uid()
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_current_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_session() TO authenticated, service_role;

-- Restrictive policies are ANDed with the existing "own rows" policies.
DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'coach_threads',
    'coach_messages',
    'progress_photos',
    'workout_logs',
    'food_logs',
    'weight_logs',
    'daily_activity',
    'user_goals',
    'weekly_reports',
    'notifications',
    'user_profiles',
    'body_scans',
    'coach_user_memory',
    'user_app_state'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "current device only" ON public.%I', target);
    EXECUTE format(
      'CREATE POLICY "current device only" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING ((SELECT public.is_current_session())) WITH CHECK ((SELECT public.is_current_session()))',
      target
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "current device only" ON public.scan_quota_usage;
CREATE POLICY "current device only" ON public.scan_quota_usage
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT public.is_current_session()));

DROP POLICY IF EXISTS "progress-photos current device only" ON storage.objects;
CREATE POLICY "progress-photos current device only" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'progress-photos' OR (SELECT public.is_current_session()))
  WITH CHECK (bucket_id <> 'progress-photos' OR (SELECT public.is_current_session()));

-- The scan quota functions run as SECURITY DEFINER (bypassing RLS), so they check too.
CREATE OR REPLACE FUNCTION public.get_scan_quota(p_scan_type text)
RETURNS TABLE (
  allowed boolean,
  used integer,
  remaining integer,
  limit_count integer,
  resets_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_start date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  v_used integer;
  v_limit constant integer := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_current_session() THEN
    RAISE EXCEPTION 'SESSION_REPLACED';
  END IF;
  IF p_scan_type NOT IN ('face', 'body') THEN
    RAISE EXCEPTION 'Invalid scan type';
  END IF;

  SELECT count(*)::integer
    INTO v_used
    FROM public.scan_quota_usage AS usage
   WHERE usage.user_id = v_user_id
     AND usage.scan_type = p_scan_type
     AND usage.period_start = v_period_start;

  RETURN QUERY SELECT
    v_used < v_limit,
    LEAST(v_used, v_limit),
    GREATEST(v_limit - v_used, 0),
    v_limit,
    ((v_period_start + 7)::timestamp AT TIME ZONE 'UTC');
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_scan_quota(
  p_submission_id uuid,
  p_scan_type text
)
RETURNS TABLE (
  allowed boolean,
  used integer,
  remaining integer,
  limit_count integer,
  resets_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_start date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  v_used integer;
  v_limit constant integer := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_current_session() THEN
    RAISE EXCEPTION 'SESSION_REPLACED';
  END IF;
  IF p_scan_type NOT IN ('face', 'body') THEN
    RAISE EXCEPTION 'Invalid scan type';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.body_scans AS scan
     WHERE scan.id = p_submission_id
       AND scan.user_id = v_user_id
       AND scan.result->>'kind' = 'scan_submission'
       AND scan.result->>'scan_type' = p_scan_type
  ) THEN
    RAISE EXCEPTION 'Invalid scan submission';
  END IF;

  -- Serialize claims for this user/type/week so parallel tabs cannot exceed five.
  PERFORM pg_advisory_xact_lock(
    hashtext(v_user_id::text || ':' || p_scan_type || ':' || v_period_start::text)
  );

  SELECT count(*)::integer
    INTO v_used
    FROM public.scan_quota_usage AS usage
   WHERE usage.user_id = v_user_id
     AND usage.scan_type = p_scan_type
     AND usage.period_start = v_period_start;

  IF v_used >= v_limit THEN
    RETURN QUERY SELECT
      false,
      v_limit,
      0,
      v_limit,
      ((v_period_start + 7)::timestamp AT TIME ZONE 'UTC');
    RETURN;
  END IF;

  INSERT INTO public.scan_quota_usage (
    user_id,
    submission_id,
    scan_type,
    period_start
  ) VALUES (
    v_user_id,
    p_submission_id,
    p_scan_type,
    v_period_start
  );

  v_used := v_used + 1;
  RETURN QUERY SELECT
    true,
    v_used,
    v_limit - v_used,
    v_limit,
    ((v_period_start + 7)::timestamp AT TIME ZONE 'UTC');
END;
$$;

REVOKE ALL ON FUNCTION public.get_scan_quota(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_scan_quota(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scan_quota(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_scan_quota(uuid, text) TO authenticated, service_role;
