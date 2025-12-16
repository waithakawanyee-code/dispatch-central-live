-- Create a table for future date driver assignments
CREATE TABLE public.future_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  assignment_date DATE NOT NULL,
  report_time TIME WITHOUT TIME ZONE,
  vehicle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(driver_id, assignment_date)
);

-- Enable Row Level Security
ALTER TABLE public.future_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read future assignments" 
ON public.future_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert future assignments" 
ON public.future_assignments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update future assignments" 
ON public.future_assignments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete future assignments" 
ON public.future_assignments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster date-based queries
CREATE INDEX idx_future_assignments_date ON public.future_assignments(assignment_date);