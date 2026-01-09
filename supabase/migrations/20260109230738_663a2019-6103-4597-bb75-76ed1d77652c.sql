-- Step 1: Add 'fleet' as a new enum value
ALTER TYPE vehicle_classification ADD VALUE IF NOT EXISTS 'fleet';