-- Restrict drivers SELECT to admins and dispatchers only (protecting PII)
DROP POLICY IF EXISTS "Authenticated users can read drivers" ON public.drivers;

CREATE POLICY "Admins can read all drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Dispatchers can read all drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (has_profile_role(auth.uid(), 'DISPATCHER'::profile_role));

-- Create a view with non-sensitive columns for other authenticated users (display pages)
CREATE OR REPLACE VIEW public.drivers_public AS
SELECT 
  id, name, status, code, vehicle, default_vehicle, 
  is_active, has_cdl, report_time,
  amtrak_trained, amtrak_primary, bph_trained, bph_primary,
  created_at, updated_at
FROM public.drivers;

-- Grant access to the view
GRANT SELECT ON public.drivers_public TO authenticated;
GRANT SELECT ON public.drivers_public TO anon;