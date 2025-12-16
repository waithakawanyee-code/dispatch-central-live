-- Add 4-letter code column to drivers table
ALTER TABLE public.drivers ADD COLUMN code VARCHAR(4);

-- Add a comment to document the column
COMMENT ON COLUMN public.drivers.code IS 'Unique 4-letter driver code identifier';