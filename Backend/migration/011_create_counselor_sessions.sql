CREATE TABLE IF NOT EXISTS public.counselor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed','emergency_flagged')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);
