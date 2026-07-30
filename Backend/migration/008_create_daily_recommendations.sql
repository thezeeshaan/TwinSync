CREATE TABLE IF NOT EXISTS public.daily_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    check_in_id UUID REFERENCES public.check_ins(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_read BOOLEAN DEFAULT false,
    recommendation_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
