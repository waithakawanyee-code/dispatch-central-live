-- Create enums for maintenance events (if they don't exist from partial run)
DO $$ BEGIN
  CREATE TYPE maintenance_category AS ENUM ('mechanical', 'electrical', 'tire', 'body', 'cleaning', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create vehicle_maintenance_events table
CREATE TABLE public.vehicle_maintenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  status vehicle_status NOT NULL DEFAULT 'out-of-service',
  issue_description TEXT NOT NULL,
  category maintenance_category NOT NULL DEFAULT 'other',
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  estimated_return_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create partial unique index for only one open event per vehicle
CREATE UNIQUE INDEX unique_open_event_per_vehicle 
ON public.vehicle_maintenance_events(vehicle_id) 
WHERE resolved_at IS NULL;

-- Add current_maintenance_event_id to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN current_maintenance_event_id UUID REFERENCES public.vehicle_maintenance_events(id);

-- Enable RLS
ALTER TABLE public.vehicle_maintenance_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_maintenance_events
CREATE POLICY "Authenticated users can read maintenance events"
ON public.vehicle_maintenance_events
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert maintenance events"
ON public.vehicle_maintenance_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update maintenance events"
ON public.vehicle_maintenance_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete maintenance events"
ON public.vehicle_maintenance_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for faster lookups
CREATE INDEX idx_maintenance_events_vehicle_id ON public.vehicle_maintenance_events(vehicle_id);
CREATE INDEX idx_maintenance_events_status ON public.vehicle_maintenance_events(status);
CREATE INDEX idx_maintenance_events_resolved_at ON public.vehicle_maintenance_events(resolved_at);

-- Enable realtime for maintenance events
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_maintenance_events;