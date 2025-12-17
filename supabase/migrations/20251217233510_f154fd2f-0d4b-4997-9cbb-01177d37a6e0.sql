-- Add default_vehicle column to drivers table for take-home vehicle assignments
ALTER TABLE public.drivers 
ADD COLUMN default_vehicle text;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.drivers.default_vehicle IS 'Default/take-home vehicle unit that is automatically assigned when driver is scheduled';