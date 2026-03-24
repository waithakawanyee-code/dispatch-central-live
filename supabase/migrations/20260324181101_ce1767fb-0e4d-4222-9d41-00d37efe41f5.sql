-- Fix SECURITY DEFINER view by making it SECURITY INVOKER
CREATE OR REPLACE VIEW public.drivers_public
WITH (security_invoker = true) AS
SELECT 
  id, name, status, code, vehicle, default_vehicle, 
  is_active, has_cdl, report_time,
  amtrak_trained, amtrak_primary, bph_trained, bph_primary,
  created_at, updated_at
FROM public.drivers;