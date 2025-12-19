-- Add email and address columns to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS address text;