CREATE TABLE IF NOT EXISTS public.counselor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counselor_id UUID NOT NULL REFERENCES public.counselors(id) ON DELETE CASCADE,
    day_of_week VARCHAR(3) CHECK (day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
    specific_date DATE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
