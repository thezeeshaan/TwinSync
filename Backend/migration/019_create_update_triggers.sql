-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach triggers to core tables
DROP TRIGGER IF EXISTS update_institutes_updated_at ON public.institutes;
CREATE TRIGGER update_institutes_updated_at BEFORE UPDATE ON public.institutes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_counselors_updated_at ON public.counselors;
CREATE TRIGGER update_counselors_updated_at BEFORE UPDATE ON public.counselors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_consents_updated_at ON public.user_consents;
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON public.user_consents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_conversations_updated_at ON public.community_conversations;
CREATE TRIGGER update_community_conversations_updated_at BEFORE UPDATE ON public.community_conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
