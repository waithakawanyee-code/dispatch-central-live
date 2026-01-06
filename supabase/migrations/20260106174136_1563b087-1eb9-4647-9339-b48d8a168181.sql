-- Create enum for vehicle primary category
CREATE TYPE public.vehicle_primary_category AS ENUM ('above_all', 'specialty');

-- Add primary_category column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN primary_category public.vehicle_primary_category NOT NULL DEFAULT 'above_all';

-- Existing vehicles: all get 'above_all' as primary category (already done via default)
-- Their existing classification (house/take_home) is preserved as the secondary category

-- Add a comment for clarity
COMMENT ON COLUMN public.vehicles.primary_category IS 'Primary category: above_all (can have secondary classification) or specialty (no secondary)';
COMMENT ON COLUMN public.vehicles.classification IS 'Secondary classification: only applies when primary_category is above_all';