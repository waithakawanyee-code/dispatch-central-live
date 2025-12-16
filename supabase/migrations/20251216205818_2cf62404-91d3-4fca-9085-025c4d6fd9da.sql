-- Enable REPLICA IDENTITY FULL for drivers table to capture complete row data
ALTER TABLE public.drivers REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for vehicles table to capture complete row data  
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;