-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create driver schedules table for weekly availability
CREATE TABLE public.driver_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  is_off boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(driver_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.driver_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read schedules"
ON public.driver_schedules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert schedules"
ON public.driver_schedules
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update schedules"
ON public.driver_schedules
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete schedules"
ON public.driver_schedules
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_driver_schedules_updated_at
BEFORE UPDATE ON public.driver_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();