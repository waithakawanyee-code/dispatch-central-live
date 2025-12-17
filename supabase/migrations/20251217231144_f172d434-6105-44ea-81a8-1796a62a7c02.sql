-- Create table for vehicle assignment history
CREATE TABLE public.vehicle_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_unit TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_assignment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read vehicle assignment history" 
ON public.vehicle_assignment_history 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert vehicle assignment history" 
ON public.vehicle_assignment_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update vehicle assignment history" 
ON public.vehicle_assignment_history 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vehicle assignment history" 
ON public.vehicle_assignment_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_vehicle_assignment_history_vehicle_id ON public.vehicle_assignment_history(vehicle_id);
CREATE INDEX idx_vehicle_assignment_history_driver_id ON public.vehicle_assignment_history(driver_id);
CREATE INDEX idx_vehicle_assignment_history_assigned_at ON public.vehicle_assignment_history(assigned_at DESC);