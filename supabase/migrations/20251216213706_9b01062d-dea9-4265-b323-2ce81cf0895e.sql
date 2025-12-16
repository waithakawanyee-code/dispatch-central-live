-- Add report_time column to drivers table
ALTER TABLE public.drivers 
ADD COLUMN report_time time without time zone;