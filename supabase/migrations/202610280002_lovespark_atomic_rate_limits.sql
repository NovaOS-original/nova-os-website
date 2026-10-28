CREATE TABLE IF NOT EXISTS public.lovespark_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
ALTER TABLE public.lovespark_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.lovespark_rate_limits FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.lovespark_allow_request(text, integer, integer);
CREATE OR REPLACE FUNCTION public.lovespark_allow_request(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_count integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) < 20 OR length(p_bucket_key) > 180
     OR p_max_requests < 1 OR p_max_requests > 10000
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RETURN false;
  END IF;

  DELETE FROM public.lovespark_rate_limits
   WHERE window_started_at < v_now - interval '48 hours';

  INSERT INTO public.lovespark_rate_limits AS current_window
    (bucket_key, window_started_at, request_count)
  VALUES (p_bucket_key, v_now, 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET window_started_at = CASE
          WHEN v_now >= current_window.window_started_at + make_interval(secs => p_window_seconds)
          THEN v_now ELSE current_window.window_started_at END,
        request_count = CASE
          WHEN v_now >= current_window.window_started_at + make_interval(secs => p_window_seconds)
          THEN 1 ELSE current_window.request_count + 1 END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$function$;
REVOKE ALL ON FUNCTION public.lovespark_allow_request(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lovespark_allow_request(text, integer, integer) TO service_role;
