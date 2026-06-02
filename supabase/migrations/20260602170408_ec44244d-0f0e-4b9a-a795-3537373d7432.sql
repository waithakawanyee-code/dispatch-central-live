ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS last_portal_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portal_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS portal_auth_password text;

REVOKE SELECT (pin_hash, portal_auth_password) ON public.drivers FROM anon, authenticated;
REVOKE UPDATE (pin_hash, portal_auth_password) ON public.drivers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'DRIVER' AND active = true
  )
$$;

CREATE TABLE IF NOT EXISTS public.driver_portal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid,
  initials text,
  event_type text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip text,
  user_agent text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.driver_portal_audit TO authenticated;
GRANT ALL ON public.driver_portal_audit TO service_role;

ALTER TABLE public.driver_portal_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and dispatchers can read driver portal audit" ON public.driver_portal_audit;
CREATE POLICY "Admins and dispatchers can read driver portal audit"
ON public.driver_portal_audit
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.has_profile_role(auth.uid(), 'DISPATCHER'));

CREATE INDEX IF NOT EXISTS idx_driver_portal_audit_driver_created
  ON public.driver_portal_audit (driver_id, created_at DESC);

DROP POLICY IF EXISTS "Drivers can read own row" ON public.drivers;
CREATE POLICY "Drivers can read own row"
ON public.drivers
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());