-- Create enum for vehicle classification
CREATE TYPE public.vehicle_classification AS ENUM ('house', 'take_home');

-- Add classification column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN classification public.vehicle_classification NOT NULL DEFAULT 'house';

-- Add assigned_driver_id for take-home vehicles (the driver who permanently has this vehicle)
ALTER TABLE public.vehicles 
ADD COLUMN assigned_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;