-- Protect the vision API budget with an account-level weekly allowance.
-- Face and body scans each receive five analysis attempts per UTC week.

CREATE TABLE IF NOT EXISTS public.scan_quota_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('face', 'body')),
  period_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_quota_usage_lookup_idx
  ON public.scan_quota_usage (user_id, scan_type, period_start, created_at);

ALTER TABLE public.scan_quota_usage ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.scan_quota_usage TO authenticated;
GRANT ALL ON public.scan_quota_usage TO service_role;

DROP POLICY IF EXISTS "read own scan quota usage" ON public.scan_quota_usage;
CREATE POLICY "read own scan quota usage" ON public.scan_quota_usage
  FOR SELECT USING (auth.uid() = user_id);

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
