
-- Create time off type enum
CREATE TYPE public.time_off_type AS ENUM ('vacation', 'sick', 'personal', 'fmla');

-- Create time off status enum
CREATE TYPE public.time_off_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- Create driver time off table
CREATE TABLE public.driver_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  time_off_type public.time_off_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  status public.time_off_status NOT NULL DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_time_off ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read time off" ON public.driver_time_off
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert time off" ON public.driver_time_off
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update time off" ON public.driver_time_off
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete time off" ON public.driver_time_off
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_driver_time_off_updated_at
  BEFORE UPDATE ON public.driver_time_off
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
