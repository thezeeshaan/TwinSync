CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    campus_wellbeing BOOLEAN DEFAULT false,
    daily_recommendations BOOLEAN DEFAULT false,
    counselor_sharing BOOLEAN DEFAULT false,
    emergency_protocols BOOLEAN DEFAULT false,
    anonymous_peer_support BOOLEAN DEFAULT false,
    consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
