-- Add emergency contact fields to drivers table
ALTER TABLE public.drivers
ADD COLUMN emergency_contact_name text,
ADD COLUMN emergency_contact_phone text,
ADD COLUMN emergency_contact_relationship text;