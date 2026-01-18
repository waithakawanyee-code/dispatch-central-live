
-- Fix search_path for timezone functions
CREATE OR REPLACE FUNCTION public.current_ny_date()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'America/New_York')::date
$$;

CREATE OR REPLACE FUNCTION public.current_ny_timestamp()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT now() AT TIME ZONE 'America/New_York'
$$;
