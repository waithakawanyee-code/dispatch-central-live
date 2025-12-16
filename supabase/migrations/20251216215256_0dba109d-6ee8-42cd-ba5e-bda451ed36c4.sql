-- Create time_punches table to track driver punch in/out records
CREATE TABLE public.time_punches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('in', 'out')),
  punch_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  punched_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read time punches"
ON public.time_punches
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert time punches"
ON public.time_punches
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update time punches"
ON public.time_punches
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete time punches"
ON public.time_punches
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_time_punches_driver_id ON public.time_punches(driver_id);
CREATE INDEX idx_time_punches_punch_time ON public.time_punches(punch_time DESC);

-- Enable realtime for time_punches
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_punches;