-- Add new status values to the driver_status enum
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'unassigned';
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'punched-out';