-- Chat message ids come from the AI SDK client (nanoid-style strings, not UUIDs).
-- The uuid column made every persistence insert fail silently.
ALTER TABLE public.coach_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.coach_messages ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.coach_messages ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
