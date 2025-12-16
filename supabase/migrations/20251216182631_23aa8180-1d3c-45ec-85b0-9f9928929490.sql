-- Create enum types for statuses
CREATE TYPE driver_status AS ENUM ('available', 'on-route', 'break', 'offline');
CREATE TYPE vehicle_status AS ENUM ('active', 'out-of-service');
CREATE TYPE clean_status AS ENUM ('clean', 'dirty');

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status driver_status NOT NULL DEFAULT 'offline',
  vehicle TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit TEXT NOT NULL UNIQUE,
  status vehicle_status NOT NULL DEFAULT 'active',
  clean_status clean_status NOT NULL DEFAULT 'clean',
  driver TEXT,
  mileage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (but allow public access for dispatch displays)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Public read/write policies for dispatch system (no auth required for shared screens)
CREATE POLICY "Allow public read access to drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Allow public update access to drivers" ON public.drivers FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access to drivers" ON public.drivers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public update access to vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Allow public insert access to vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;

-- Insert initial mock data for drivers
INSERT INTO public.drivers (name, status, vehicle, phone) VALUES
  ('Mike Johnson', 'available', 'V-101', '555-0101'),
  ('Sarah Chen', 'on-route', 'V-102', '555-0102'),
  ('James Wilson', 'break', 'V-103', '555-0103'),
  ('Emily Davis', 'available', 'V-104', '555-0104'),
  ('Robert Brown', 'on-route', 'V-105', '555-0105'),
  ('Lisa Anderson', 'offline', NULL, '555-0106'),
  ('David Martinez', 'available', 'V-107', '555-0107'),
  ('Jennifer Taylor', 'on-route', 'V-108', '555-0108');

-- Insert initial mock data for vehicles
INSERT INTO public.vehicles (unit, status, clean_status, driver, mileage) VALUES
  ('V-101', 'active', 'clean', 'Mike Johnson', 45230),
  ('V-102', 'active', 'clean', 'Sarah Chen', 38100),
  ('V-103', 'active', 'dirty', 'James Wilson', 52400),
  ('V-104', 'active', 'clean', 'Emily Davis', 29800),
  ('V-105', 'active', 'clean', 'Robert Brown', 61200),
  ('V-106', 'out-of-service', 'dirty', NULL, 78500),
  ('V-107', 'active', 'clean', 'David Martinez', 33100),
  ('V-108', 'active', 'dirty', 'Jennifer Taylor', 41900);