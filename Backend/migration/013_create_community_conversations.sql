CREATE TABLE IF NOT EXISTS public.community_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_two_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(participant_one_id, participant_two_id)
);
