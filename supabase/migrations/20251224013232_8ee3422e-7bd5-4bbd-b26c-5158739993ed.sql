-- Add new values to vehicle_status enum
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'returned';