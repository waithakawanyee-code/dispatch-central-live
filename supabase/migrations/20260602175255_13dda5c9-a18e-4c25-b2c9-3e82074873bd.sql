
CREATE POLICY "Drivers can insert own portal audit"
ON public.driver_portal_audit
FOR INSERT TO authenticated
WITH CHECK (driver_id = public.current_driver_id());
