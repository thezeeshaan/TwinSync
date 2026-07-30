CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trigger_source VARCHAR(20) NOT NULL CHECK (trigger_source IN ('ai_session','check_in','manual')),
    trigger_reference_id UUID,
    distress_description TEXT,
    location TEXT,
    emergency_contact_notified BOOLEAN DEFAULT false,
    faculty_advisor_notified BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'triggered' CHECK (status IN ('triggered','acknowledged','resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);
