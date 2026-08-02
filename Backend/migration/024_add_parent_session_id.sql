-- Add parent_session_id to counselor_sessions for session reconnection
-- When a student reconnects with a past counselor, the new session
-- points back to the original session via this FK.
ALTER TABLE public.counselor_sessions 
ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES public.counselor_sessions(id);
