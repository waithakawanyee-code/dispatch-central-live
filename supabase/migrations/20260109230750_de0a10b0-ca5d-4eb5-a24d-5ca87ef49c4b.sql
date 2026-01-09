-- Step 2: Update all existing 'house' records to 'fleet'
UPDATE public.vehicles 
SET classification = 'fleet'::vehicle_classification 
WHERE classification = 'house'::vehicle_classification;

-- Update the default value for the classification column
ALTER TABLE public.vehicles 
ALTER COLUMN classification SET DEFAULT 'fleet'::vehicle_classification;