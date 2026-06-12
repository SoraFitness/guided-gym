
-- progress_photos table
CREATE TABLE public.progress_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('front','side','back','custom')),
  weight_kg numeric(6,2),
  taken_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress photos select" ON public.progress_photos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own progress photos insert" ON public.progress_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress photos update" ON public.progress_photos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress photos delete" ON public.progress_photos
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX progress_photos_user_taken_idx ON public.progress_photos (user_id, taken_on DESC);

CREATE OR REPLACE FUNCTION public.touch_progress_photos_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER progress_photos_set_updated_at
  BEFORE UPDATE ON public.progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.touch_progress_photos_updated_at();

-- Storage object policies for the 'progress-photos' bucket
-- Files are stored under '<user_id>/...' so the first folder must match auth.uid()
CREATE POLICY "progress-photos own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "progress-photos own insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "progress-photos own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "progress-photos own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
