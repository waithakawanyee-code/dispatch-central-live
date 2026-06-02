-- Helper: returns the driver row id linked to the current auth user
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE auth_user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_driver_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_driver_id() TO authenticated;

-- driver_time_off: approval workflow columns
ALTER TABLE public.driver_time_off
  ADD COLUMN IF NOT EXISTS hours_requested numeric(6,2),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS decided_by uuid,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text;

-- ============ driver_schedules: driver self-service ============
CREATE POLICY "Drivers read own schedule" ON public.driver_schedules
  FOR SELECT TO authenticated
  USING (driver_id = public.current_driver_id() OR public.is_dispatcher_or_admin());

CREATE POLICY "Drivers insert own schedule rows" ON public.driver_schedules
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = public.current_driver_id());

CREATE POLICY "Drivers update own schedule" ON public.driver_schedules
  FOR UPDATE TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

CREATE POLICY "Drivers delete own schedule" ON public.driver_schedules
  FOR DELETE TO authenticated
  USING (driver_id = public.current_driver_id());

-- ============ driver_time_off: driver self-service ============
-- Add a driver-scoped read policy (existing "Authenticated users can read time off" stays for staff)
CREATE POLICY "Drivers read own time off" ON public.driver_time_off
  FOR SELECT TO authenticated
  USING (driver_id = public.current_driver_id());

CREATE POLICY "Drivers create own time off" ON public.driver_time_off
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = public.current_driver_id()
    AND decided_at IS NULL
    AND status = 'pending'::time_off_status
  );

CREATE POLICY "Drivers cancel own undecided requests" ON public.driver_time_off
  FOR DELETE TO authenticated
  USING (driver_id = public.current_driver_id() AND decided_at IS NULL);

-- ============ call_outs: driver self-service for today ============
CREATE POLICY "Drivers read own call outs" ON public.call_outs
  FOR SELECT TO authenticated
  USING (driver_id = public.current_driver_id());

CREATE POLICY "Drivers create own call outs today" ON public.call_outs
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = public.current_driver_id()
    AND call_out_date = public.current_ny_date()
  );

CREATE POLICY "Drivers update own call outs today" ON public.call_outs
  FOR UPDATE TO authenticated
  USING (driver_id = public.current_driver_id() AND call_out_date = public.current_ny_date())
  WITH CHECK (driver_id = public.current_driver_id() AND call_out_date = public.current_ny_date());

CREATE POLICY "Drivers delete own call outs today" ON public.call_outs
  FOR DELETE TO authenticated
  USING (driver_id = public.current_driver_id() AND call_out_date = public.current_ny_date());

-- Enable realtime on call_outs and driver_time_off for dispatcher live views
ALTER TABLE public.call_outs REPLICA IDENTITY FULL;
ALTER TABLE public.driver_time_off REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_outs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_time_off;