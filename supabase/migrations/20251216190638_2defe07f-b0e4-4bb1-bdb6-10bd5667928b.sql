-- Add new driver status values to the enum
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'off';
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'working';