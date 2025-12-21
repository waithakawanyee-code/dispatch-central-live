-- Add second emergency contact fields to drivers table
ALTER TABLE public.drivers
ADD COLUMN emergency_contact_name_2 text,
ADD COLUMN emergency_contact_phone_2 text,
ADD COLUMN emergency_contact_relationship_2 text;