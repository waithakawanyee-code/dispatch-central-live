-- Create shifts table for workday-aware time tracking
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  
  -- Punch times
  punch_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  punch_out_at TIMESTAMPTZ, -- NULL = open/active shift
  
  -- Workday assignment (DATE of punch_in_at by default, can be overridden)
  workday_date DATE NOT NULL DEFAULT CURRENT_DATE,
  workday_override BOOLEAN NOT NULL DEFAULT false,
  workday_override_reason TEXT,
  workday_override_by UUID,
  workday_override_at TIMESTAMPTZ,
  
  -- Vehicle at start of shift
  vehicle_unit TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  notes TEXT,
  
  -- Exception tracking (auto_closed_prev_shift, forced_closed, times_edited, etc.)
  exception_flags JSONB DEFAULT '{}'::jsonb
);

-- Create shift_vehicle_segments table for tracking vehicle changes within a shift
CREATE TABLE public.shift_vehicle_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_unit TEXT NOT NULL,
  
  segment_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  segment_out_at TIMESTAMPTZ, -- NULL = current/active segment
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create workdays table for UI state and closeout tracking
CREATE TABLE public.workdays (
  workday_date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_shifts_driver_id ON public.shifts(driver_id);
CREATE INDEX idx_shifts_workday_date ON public.shifts(workday_date);
CREATE INDEX idx_shifts_punch_in_at ON public.shifts(punch_in_at);
CREATE INDEX idx_shifts_open ON public.shifts(driver_id) WHERE punch_out_at IS NULL;
CREATE INDEX idx_shift_vehicle_segments_shift_id ON public.shift_vehicle_segments(shift_id);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_vehicle_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workdays ENABLE ROW LEVEL SECURITY;

-- RLS policies for shifts
CREATE POLICY "Authenticated users can read shifts"
  ON public.shifts FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert shifts"
  ON public.shifts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shifts"
  ON public.shifts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete shifts"
  ON public.shifts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shift_vehicle_segments
CREATE POLICY "Authenticated users can read shift vehicle segments"
  ON public.shift_vehicle_segments FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert shift vehicle segments"
  ON public.shift_vehicle_segments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shift vehicle segments"
  ON public.shift_vehicle_segments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete shift vehicle segments"
  ON public.shift_vehicle_segments FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for workdays
CREATE POLICY "Authenticated users can read workdays"
  ON public.workdays FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert workdays"
  ON public.workdays FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update workdays"
  ON public.workdays FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete workdays"
  ON public.workdays FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated at trigger for shifts
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for shifts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_vehicle_segments;