-- Create vehicle status events table
CREATE TABLE public.vehicle_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL,
  payload_json jsonb,
  idempotency_key text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_vehicle_status_events_vehicle_id ON public.vehicle_status_events(vehicle_id);
CREATE INDEX idx_vehicle_status_events_event_type ON public.vehicle_status_events(event_type);
CREATE INDEX idx_vehicle_status_events_occurred_at ON public.vehicle_status_events(occurred_at);

-- Enable RLS
ALTER TABLE public.vehicle_status_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read vehicle status events"
ON public.vehicle_status_events
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert vehicle status events"
ON public.vehicle_status_events
FOR INSERT
WITH CHECK (true);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;