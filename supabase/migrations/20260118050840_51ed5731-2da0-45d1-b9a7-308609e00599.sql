
-- Create enums for the car washer module
CREATE TYPE public.queue_type AS ENUM ('SPECIALTY', 'GENERAL');
CREATE TYPE public.queue_item_urgency AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE public.queue_item_status AS ENUM ('PENDING', 'CLEAN');
CREATE TYPE public.alert_level AS ENUM ('URGENT');
CREATE TYPE public.damage_type AS ENUM ('SCRATCH', 'DENT', 'INTERIOR', 'GLASS', 'OTHER');
CREATE TYPE public.damage_status AS ENUM ('OPEN', 'SUBMITTED', 'CLOSED');

-- 1) cleaning_queues table
CREATE TABLE public.cleaning_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_date DATE NOT NULL,
  queue_type queue_type NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cleaning_queues_date_type_unique UNIQUE (queue_date, queue_type)
);

-- 2) cleaning_queue_items table
CREATE TABLE public.cleaning_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.cleaning_queues(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  position INTEGER NOT NULL,
  out_at TIMESTAMPTZ,
  dispatcher_notes TEXT,
  urgency queue_item_urgency NOT NULL DEFAULT 'NORMAL',
  status queue_item_status NOT NULL DEFAULT 'PENDING',
  cleaned_by UUID REFERENCES auth.users(id),
  cleaned_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cleaning_queue_items_queue_vehicle_unique UNIQUE (queue_id, vehicle_id)
);

-- Indexes for cleaning_queue_items
CREATE INDEX idx_cleaning_queue_items_queue_position ON public.cleaning_queue_items(queue_id, position);
CREATE INDEX idx_cleaning_queue_items_vehicle ON public.cleaning_queue_items(vehicle_id);
CREATE INDEX idx_cleaning_queue_items_status ON public.cleaning_queue_items(status);

-- 3) queue_alerts table
CREATE TABLE public.queue_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES public.cleaning_queue_items(id) ON DELETE CASCADE,
  alert_message TEXT,
  alert_level alert_level NOT NULL DEFAULT 'URGENT',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_alerts_queue_item ON public.queue_alerts(queue_item_id);

-- 4) alert_acknowledgements table
CREATE TABLE public.alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.queue_alerts(id) ON DELETE CASCADE,
  acknowledged_by UUID NOT NULL REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT alert_acknowledgements_alert_unique UNIQUE (alert_id)
);

-- 5) damage_reports table
CREATE TABLE public.damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  queue_item_id UUID REFERENCES public.cleaning_queue_items(id),
  started_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  damage_type damage_type NOT NULL,
  damage_location TEXT,
  notes TEXT,
  status damage_status NOT NULL DEFAULT 'OPEN',
  submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_damage_reports_vehicle ON public.damage_reports(vehicle_id);
CREATE INDEX idx_damage_reports_queue_item ON public.damage_reports(queue_item_id);
CREATE INDEX idx_damage_reports_status ON public.damage_reports(status);

-- 6) damage_photos table
CREATE TABLE public.damage_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES public.damage_reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_damage_photos_report ON public.damage_photos(damage_report_id);

-- Create storage bucket for damage photos (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('damage-photos', 'damage-photos', false);

-- Enable RLS on all tables
ALTER TABLE public.cleaning_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cleaning_queues
CREATE POLICY "Admins and dispatchers can manage queues" ON public.cleaning_queues
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can read queues" ON public.cleaning_queues
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

-- RLS Policies for cleaning_queue_items
CREATE POLICY "Admins and dispatchers can manage queue items" ON public.cleaning_queue_items
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can read queue items" ON public.cleaning_queue_items
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

CREATE POLICY "Washers can update queue item status" ON public.cleaning_queue_items
  FOR UPDATE USING (has_role(auth.uid(), 'washer'))
  WITH CHECK (has_role(auth.uid(), 'washer'));

-- RLS Policies for queue_alerts
CREATE POLICY "Admins and dispatchers can manage alerts" ON public.queue_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can read alerts" ON public.queue_alerts
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

-- RLS Policies for alert_acknowledgements
CREATE POLICY "Admins and dispatchers can manage acknowledgements" ON public.alert_acknowledgements
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can create acknowledgements" ON public.alert_acknowledgements
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'washer'));

CREATE POLICY "Washers can read acknowledgements" ON public.alert_acknowledgements
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

-- RLS Policies for damage_reports
CREATE POLICY "Admins and dispatchers can manage damage reports" ON public.damage_reports
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can create damage reports" ON public.damage_reports
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'washer'));

CREATE POLICY "Washers can update own damage reports" ON public.damage_reports
  FOR UPDATE USING (has_role(auth.uid(), 'washer') AND started_by = auth.uid());

CREATE POLICY "Washers can read damage reports" ON public.damage_reports
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

-- RLS Policies for damage_photos
CREATE POLICY "Admins and dispatchers can manage damage photos" ON public.damage_photos
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'));

CREATE POLICY "Washers can insert damage photos" ON public.damage_photos
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'washer'));

CREATE POLICY "Washers can read damage photos" ON public.damage_photos
  FOR SELECT USING (has_role(auth.uid(), 'washer'));

-- Storage policies for damage-photos bucket
CREATE POLICY "Authenticated users can view damage photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'damage-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Washers dispatchers admins can upload damage photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'damage-photos' AND 
    (has_role(auth.uid(), 'washer') OR has_role(auth.uid(), 'dispatcher') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins and dispatchers can delete damage photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'damage-photos' AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dispatcher'))
  );
