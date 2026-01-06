-- Add phone column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN phone text NULL;

COMMENT ON COLUMN public.vehicles.phone IS 'Contact phone number for the vehicle';