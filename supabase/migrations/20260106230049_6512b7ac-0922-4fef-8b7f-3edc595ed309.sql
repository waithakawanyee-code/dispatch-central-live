-- Add 'unknown' to clean_status enum
ALTER TYPE clean_status ADD VALUE IF NOT EXISTS 'unknown';

-- Add new columns for clean status automation tracking
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS last_wash_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_marked_dirty_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dirty_reason text,
ADD COLUMN IF NOT EXISTS clean_status_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS clean_status_source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS always_clean_exempt boolean NOT NULL DEFAULT false;