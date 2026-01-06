-- Add car wash subscription field to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN has_car_wash_subscription boolean NOT NULL DEFAULT false;