-- Add is_active column to drivers table for employment status (separate from daily operational status)
ALTER TABLE public.drivers 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for filtering active/inactive drivers
CREATE INDEX idx_drivers_is_active ON public.drivers(is_active);