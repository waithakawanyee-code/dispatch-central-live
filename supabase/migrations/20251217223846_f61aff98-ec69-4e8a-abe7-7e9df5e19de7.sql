-- Create vehicle_type enum
CREATE TYPE public.vehicle_type AS ENUM (
  'sedan_volvo',
  'sedan_aviator',
  'suv',
  'exec_transit',
  'sprinter_limo',
  'stretch_limo',
  '28_shuttle',
  '37_shuttle',
  '39_shuttle',
  '56_mc',
  '32_limo_bus',
  'trolley'
);

-- Add vehicle_type column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN vehicle_type public.vehicle_type;