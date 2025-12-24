-- Create partial unique index to enforce only ONE open ticket per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_maintenance_events_one_open_per_vehicle 
ON public.vehicle_maintenance_events(vehicle_id) 
WHERE closed_at IS NULL;

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_events_vehicle_closed 
ON public.vehicle_maintenance_events(vehicle_id, closed_at);

-- Function to update vehicle status when maintenance event is created
CREATE OR REPLACE FUNCTION public.on_maintenance_event_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set out-of-service if this is a new open ticket (closed_at IS NULL)
  IF NEW.closed_at IS NULL THEN
    UPDATE public.vehicles 
    SET status = 'out-of-service', 
        current_maintenance_event_id = NEW.id,
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update vehicle status when maintenance event is closed
CREATE OR REPLACE FUNCTION public.on_maintenance_event_closed()
RETURNS TRIGGER AS $$
BEGIN
  -- If closed_at changed from NULL to a value, vehicle returns to service
  IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN
    -- Set actual_back_in_service_at if blank
    IF NEW.actual_back_in_service_at IS NULL THEN
      NEW.actual_back_in_service_at := now();
    END IF;
    
    -- Update vehicle status to active and clear maintenance event reference
    UPDATE public.vehicles 
    SET status = 'active', 
        current_maintenance_event_id = NULL,
        updated_at = now()
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new maintenance events
DROP TRIGGER IF EXISTS trigger_maintenance_event_created ON public.vehicle_maintenance_events;
CREATE TRIGGER trigger_maintenance_event_created
AFTER INSERT ON public.vehicle_maintenance_events
FOR EACH ROW
EXECUTE FUNCTION public.on_maintenance_event_created();

-- Create trigger for closing maintenance events
DROP TRIGGER IF EXISTS trigger_maintenance_event_closed ON public.vehicle_maintenance_events;
CREATE TRIGGER trigger_maintenance_event_closed
BEFORE UPDATE ON public.vehicle_maintenance_events
FOR EACH ROW
EXECUTE FUNCTION public.on_maintenance_event_closed();

-- Backfill opened_at from created_at where needed
UPDATE public.vehicle_maintenance_events 
SET opened_at = created_at 
WHERE opened_at IS NULL;