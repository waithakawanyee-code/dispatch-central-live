-- Create call_outs table to track driver call outs
CREATE TABLE public.call_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  driver_name TEXT NOT NULL,
  call_out_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.call_outs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read call_outs" 
ON public.call_outs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert call_outs" 
ON public.call_outs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update call_outs" 
ON public.call_outs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete call_outs" 
ON public.call_outs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for efficient queries
CREATE INDEX idx_call_outs_driver_id ON public.call_outs(driver_id);
CREATE INDEX idx_call_outs_date ON public.call_outs(call_out_date);