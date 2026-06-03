
-- 1. profiles: prevent role/active self-escalation via policy (trigger already exists as defense-in-depth)
CREATE OR REPLACE FUNCTION public.get_my_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
CREATE POLICY "Users can update own profile except role"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
    AND active = public.get_my_active()
  );

-- 2. shifts: restrict reads to authenticated users
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON public.shifts;
CREATE POLICY "Authenticated users can read shifts"
  ON public.shifts
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. maintenance reference tables: restrict reads to authenticated
DROP POLICY IF EXISTS "Authenticated users can read active categories" ON public.maintenance_issue_categories;
CREATE POLICY "Authenticated users can read active categories"
  ON public.maintenance_issue_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can read active options" ON public.maintenance_issue_options;
CREATE POLICY "Authenticated users can read active options"
  ON public.maintenance_issue_options
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Authenticated users can read active templates" ON public.maintenance_issue_templates;
CREATE POLICY "Authenticated users can read active templates"
  ON public.maintenance_issue_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 4. status_history: restrict inserts to admins (service role bypasses RLS for system-generated rows)
DROP POLICY IF EXISTS "Authenticated users can insert status_history" ON public.status_history;
CREATE POLICY "Admins can insert status_history"
  ON public.status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'admin'::app_role));
