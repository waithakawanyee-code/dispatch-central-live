ALTER TYPE public.time_off_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.time_off_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.time_off_status ADD VALUE IF NOT EXISTS 'denied';