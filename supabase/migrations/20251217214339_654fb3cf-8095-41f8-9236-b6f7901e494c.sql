-- Add CDL status to drivers table
ALTER TABLE public.drivers ADD COLUMN has_cdl boolean NOT NULL DEFAULT false;