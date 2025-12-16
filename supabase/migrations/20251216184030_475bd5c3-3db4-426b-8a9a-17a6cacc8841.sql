-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public read access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow public update access to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow public insert access to drivers" ON public.drivers;

DROP POLICY IF EXISTS "Allow public read access to vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow public update access to vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow public insert access to vehicles" ON public.vehicles;

DROP POLICY IF EXISTS "Allow public read access to status_history" ON public.status_history;
DROP POLICY IF EXISTS "Allow public insert access to status_history" ON public.status_history;

-- Create authenticated-only policies for drivers
CREATE POLICY "Authenticated users can read drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (true);

-- Create authenticated-only policies for vehicles
CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Create authenticated-only policies for status_history
CREATE POLICY "Authenticated users can read status_history" ON public.status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert status_history" ON public.status_history FOR INSERT TO authenticated WITH CHECK (true);