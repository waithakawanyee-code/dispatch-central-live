-- Add released_as_fleet_until column for manual "Release as Fleet Today" toggle
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS released_as_fleet_until timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.released_as_fleet_until IS 'When set, Take Home vehicle acts as Fleet until this timestamp (typically end of day)';

-- Create table for admin assignment override history
CREATE TABLE IF NOT EXISTS public.admin_assignment_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  override_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  vehicle_unit text NOT NULL,
  driver_name text NOT NULL,
  owner_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  owner_driver_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_assignment_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read overrides"
ON public.admin_assignment_overrides
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert overrides"
ON public.admin_assignment_overrides
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete overrides"
ON public.admin_assignment_overrides
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));