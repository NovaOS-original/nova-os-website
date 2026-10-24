-- Security hardening applied to the live NOVA Supabase project on 2026-10-24.
-- Keep this migration in source control as the auditable record of the hardening.
-- User-owned tables expose no anonymous access; authenticated reads are limited by auth.uid().
REVOKE ALL ON public.nova_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.nova_profiles TO authenticated;
ALTER TABLE public.nova_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own NOVA profile" ON public.nova_profiles;
CREATE POLICY "Users can read own NOVA profile"
  ON public.nova_profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.nova_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.nova_activity_logs TO authenticated;
ALTER TABLE public.nova_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own NOVA activity" ON public.nova_activity_logs;
CREATE POLICY "Users can read own NOVA activity"
  ON public.nova_activity_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.nova_chat_usage FROM PUBLIC, anon, authenticated;
ALTER TABLE public.nova_chat_usage ENABLE ROW LEVEL SECURITY;

-- This maintenance helper must never be exposed through the public Data API.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
