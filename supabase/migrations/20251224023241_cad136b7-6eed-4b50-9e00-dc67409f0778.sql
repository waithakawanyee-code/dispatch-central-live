
-- 1) Migrate any 'maintenance' or 'returned' vehicles to 'out-of-service'
UPDATE public.vehicles SET status = 'out-of-service' WHERE status IN ('maintenance', 'returned');

-- 2) First drop the status column from vehicle_maintenance_events (it uses the old enum)
ALTER TABLE public.vehicle_maintenance_events DROP COLUMN IF EXISTS status;

-- 3) Now recreate vehicle_status enum with only 'active' and 'out-of-service'
ALTER TYPE public.vehicle_status RENAME TO vehicle_status_old;
CREATE TYPE public.vehicle_status AS ENUM ('active', 'out-of-service');
ALTER TABLE public.vehicles ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.vehicles ALTER COLUMN status TYPE public.vehicle_status USING status::text::public.vehicle_status;
ALTER TABLE public.vehicles ALTER COLUMN status SET DEFAULT 'active'::public.vehicle_status;
DROP TYPE public.vehicle_status_old;

-- 4) Restructure vehicle_maintenance_events table - drop other columns
ALTER TABLE public.vehicle_maintenance_events DROP COLUMN IF EXISTS category;
ALTER TABLE public.vehicle_maintenance_events DROP COLUMN IF EXISTS priority;
ALTER TABLE public.vehicle_maintenance_events DROP COLUMN IF EXISTS issue_description;

-- Rename existing columns for clarity
ALTER TABLE public.vehicle_maintenance_events RENAME COLUMN estimated_return_at TO expected_back_in_service_at;
ALTER TABLE public.vehicle_maintenance_events RENAME COLUMN resolved_at TO closed_at;

-- Add new columns
ALTER TABLE public.vehicle_maintenance_events ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE public.vehicle_maintenance_events ADD COLUMN IF NOT EXISTS actual_back_in_service_at timestamp with time zone;

-- Migrate created_at to opened_at for existing records
UPDATE public.vehicle_maintenance_events SET opened_at = created_at;

-- Rename created_by_user_id to created_by for consistency
ALTER TABLE public.vehicle_maintenance_events RENAME COLUMN created_by_user_id TO created_by;

-- 5) Create vehicle_maintenance_issues table for multi-issue support
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_event_id uuid NOT NULL REFERENCES public.vehicle_maintenance_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.vehicle_maintenance_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_maintenance_issues
CREATE POLICY "Authenticated users can read maintenance issues"
ON public.vehicle_maintenance_issues FOR SELECT
USING (true);

CREATE POLICY "Admins can insert maintenance issues"
ON public.vehicle_maintenance_issues FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update maintenance issues"
ON public.vehicle_maintenance_issues FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete maintenance issues"
ON public.vehicle_maintenance_issues FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_maintenance_issues_updated_at
BEFORE UPDATE ON public.vehicle_maintenance_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_vehicle_maintenance_issues_event_id ON public.vehicle_maintenance_issues(maintenance_event_id);
