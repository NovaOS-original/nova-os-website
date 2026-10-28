-- LoveSpark surprise payloads are intentionally served only by the trusted
-- lovespark-link Edge Function using its server-side service-role credential.
-- Do not add direct anon/authenticated policies for this table.
ALTER TABLE public.lovespark_surprises ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.lovespark_surprises FROM anon, authenticated;

-- Chat usage counters are backend-only as well.
ALTER TABLE public.nova_chat_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.nova_chat_usage FROM anon, authenticated;
