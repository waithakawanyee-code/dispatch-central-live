-- First, update any existing driver statuses to the new values
-- Map: unassigned -> unconfirmed, assigned -> confirmed, working -> on_the_clock, punched-out -> done, offline -> done

-- Create the new enum type
CREATE TYPE driver_status_new AS ENUM ('unconfirmed', 'confirmed', 'on_the_clock', 'done');

-- Update the drivers table to use the new enum
ALTER TABLE public.drivers 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.drivers 
  ALTER COLUMN status TYPE driver_status_new 
  USING (
    CASE status::text
      WHEN 'unassigned' THEN 'unconfirmed'::driver_status_new
      WHEN 'assigned' THEN 'confirmed'::driver_status_new
      WHEN 'working' THEN 'on_the_clock'::driver_status_new
      WHEN 'punched-out' THEN 'done'::driver_status_new
      WHEN 'offline' THEN 'done'::driver_status_new
      WHEN 'on-route' THEN 'on_the_clock'::driver_status_new
      WHEN 'available' THEN 'confirmed'::driver_status_new
      WHEN 'break' THEN 'on_the_clock'::driver_status_new
      ELSE 'unconfirmed'::driver_status_new
    END
  );

-- Set the new default
ALTER TABLE public.drivers 
  ALTER COLUMN status SET DEFAULT 'unconfirmed'::driver_status_new;

-- Drop the old enum and rename the new one
DROP TYPE driver_status;
ALTER TYPE driver_status_new RENAME TO driver_status;