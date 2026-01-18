
-- Create function to get current date in America/New_York timezone
CREATE OR REPLACE FUNCTION public.current_ny_date()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'America/New_York')::date
$$;

-- Create function to get current timestamp in America/New_York timezone
CREATE OR REPLACE FUNCTION public.current_ny_timestamp()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
  SELECT now() AT TIME ZONE 'America/New_York'
$$;
