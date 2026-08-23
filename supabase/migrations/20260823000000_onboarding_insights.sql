-- Conversion analytics for the onboarding flow. Responses are intentionally
-- anonymous and omit name, contact details, free text, and exact body metrics.
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  flow_version text NOT NULL,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, flow_version)
);

CREATE INDEX IF NOT EXISTS onboarding_submissions_created_idx
  ON public.onboarding_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS onboarding_submissions_completed_idx
  ON public.onboarding_submissions (completed_at DESC)
  WHERE completed_at IS NOT NULL;

ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.onboarding_submissions FROM anon, authenticated;
GRANT ALL ON TABLE public.onboarding_submissions TO service_role;
