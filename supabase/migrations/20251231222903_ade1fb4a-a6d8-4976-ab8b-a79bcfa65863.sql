
-- Add shuttle program fields to drivers table
ALTER TABLE public.drivers
ADD COLUMN amtrak_trained boolean NOT NULL DEFAULT false,
ADD COLUMN amtrak_primary boolean NOT NULL DEFAULT false,
ADD COLUMN bph_trained boolean NOT NULL DEFAULT false,
ADD COLUMN bph_primary boolean NOT NULL DEFAULT false,
ADD COLUMN amtrak_notes text,
ADD COLUMN bph_notes text;

-- Create shuttle schedules table for primary driver assignments
CREATE TABLE public.shuttle_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  program text NOT NULL CHECK (program IN ('amtrak', 'bph')),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- For Amtrak: shift_number 1, 2, or 3; For BPH: always 1
  shift_number integer NOT NULL DEFAULT 1 CHECK (shift_number >= 1 AND shift_number <= 3),
  -- BPH uses custom times, Amtrak uses fixed shifts
  start_time time without time zone,
  end_time time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Prevent duplicate assignments
  UNIQUE (program, day_of_week, shift_number)
);

-- Enable RLS
ALTER TABLE public.shuttle_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read shuttle schedules"
ON public.shuttle_schedules
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert shuttle schedules"
ON public.shuttle_schedules
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shuttle schedules"
ON public.shuttle_schedules
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete shuttle schedules"
ON public.shuttle_schedules
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_shuttle_schedules_updated_at
BEFORE UPDATE ON public.shuttle_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_shuttle_schedules_program_day ON public.shuttle_schedules(program, day_of_week);
CREATE INDEX idx_shuttle_schedules_driver ON public.shuttle_schedules(driver_id);
