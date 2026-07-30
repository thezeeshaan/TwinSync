CREATE TABLE IF NOT EXISTS public.mental_health_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_url TEXT NOT NULL,
    thumbnail_url TEXT,
    institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
