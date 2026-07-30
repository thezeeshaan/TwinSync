CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    age INT NOT NULL,
    department VARCHAR(255) NOT NULL,
    roll_number VARCHAR(100) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    faculty_advisor_name VARCHAR(255),
    faculty_advisor_email VARCHAR(255),
    faculty_advisor_phone VARCHAR(20),
    timetable JSONB,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    anonymous_alias VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
