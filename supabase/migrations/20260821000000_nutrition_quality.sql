-- Optional nutrient metadata used by Ascendr's transparent Fuel Quality score.
-- Existing rows remain valid and hydrate as partial-quality entries.
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS nutrition_details jsonb NOT NULL DEFAULT '{}'::jsonb;
