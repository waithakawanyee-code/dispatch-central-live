-- Add always_clean flag to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN always_clean boolean NOT NULL DEFAULT false;