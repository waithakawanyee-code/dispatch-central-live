-- Add note column to driver_schedules table
ALTER TABLE public.driver_schedules
ADD COLUMN note text;