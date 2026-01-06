-- Add is_any_hours column to driver_schedules table
ALTER TABLE public.driver_schedules 
ADD COLUMN is_any_hours boolean NOT NULL DEFAULT false;