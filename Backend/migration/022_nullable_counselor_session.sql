-- Allow counselor_sessions to exist without a counselor (waiting state)
ALTER TABLE public.counselor_sessions ALTER COLUMN counselor_id DROP NOT NULL;
