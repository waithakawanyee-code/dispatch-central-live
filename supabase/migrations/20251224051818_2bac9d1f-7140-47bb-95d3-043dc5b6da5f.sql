
-- Create maintenance_issue_categories table
CREATE TABLE public.maintenance_issue_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_issue_options table
CREATE TABLE public.maintenance_issue_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.maintenance_issue_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_issue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_issue_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Authenticated users can read active categories"
ON public.maintenance_issue_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.maintenance_issue_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for options
CREATE POLICY "Authenticated users can read active options"
ON public.maintenance_issue_options FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage options"
ON public.maintenance_issue_options FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_maintenance_issue_categories_sort ON public.maintenance_issue_categories(sort_order, label);
CREATE INDEX idx_maintenance_issue_options_category ON public.maintenance_issue_options(category_id, sort_order);

-- Triggers for updated_at
CREATE TRIGGER update_maintenance_issue_categories_updated_at
BEFORE UPDATE ON public.maintenance_issue_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_issue_options_updated_at
BEFORE UPDATE ON public.maintenance_issue_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.maintenance_issue_categories (label, sort_order) VALUES
('Service Due', 1),
('Tires', 2),
('Brakes', 3),
('Warning Lights / Sensors', 4),
('Battery / Starting', 5),
('Cooling / Overheating', 6),
('Electrical', 7),
('Transmission / Drivetrain', 8),
('Steering / Suspension', 9),
('Climate Control', 10),
('Wipers / Visibility', 11),
('Doors / Windows / Locks', 12),
('Interior', 13),
('Exterior / Body', 14),
('Glass', 15),
('Detailing / Cleanliness', 16),
('Accident / Collision', 17),
('Audio / Infotainment', 18),
('Appointment', 19),
('Must Stay At Base', 20),
('Other', 21);

-- Seed options for each category
INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Oil change', 1), ('Scheduled service', 2), ('Inspection due', 3), ('Fluids service', 4)) AS o(label, sort_order)
WHERE c.label = 'Service Due';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('TPMS light', 1), ('Flat tire', 2), ('Tire damage', 3), ('Needs new tires', 4)) AS o(label, sort_order)
WHERE c.label = 'Tires';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Squeaking', 1), ('Shaking / vibration', 2), ('Grinding', 3), ('Brake warning light', 4)) AS o(label, sort_order)
WHERE c.label = 'Brakes';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Check engine light', 1), ('ABS light', 2), ('Airbag light', 3), ('Other warning light', 4)) AS o(label, sort_order)
WHERE c.label = 'Warning Lights / Sensors';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Won''t start', 1), ('Weak battery', 2), ('Charging system issue', 3)) AS o(label, sort_order)
WHERE c.label = 'Battery / Starting';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Overheating', 1), ('Coolant leak', 2)) AS o(label, sort_order)
WHERE c.label = 'Cooling / Overheating';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Lights not working', 1), ('Wiring / fuse issue', 2), ('Electrical malfunction', 3)) AS o(label, sort_order)
WHERE c.label = 'Electrical';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Transmission issue', 1), ('Shifting problem', 2), ('Drivetrain noise', 3)) AS o(label, sort_order)
WHERE c.label = 'Transmission / Drivetrain';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Suspension noise', 1), ('Alignment issue', 2), ('Vibration while driving', 3)) AS o(label, sort_order)
WHERE c.label = 'Steering / Suspension';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('No heat', 1), ('No A/C', 2)) AS o(label, sort_order)
WHERE c.label = 'Climate Control';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Wipers not working', 1), ('Washer issue', 2)) AS o(label, sort_order)
WHERE c.label = 'Wipers / Visibility';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Door malfunction', 1), ('Window not working', 2), ('Lock issue', 3)) AS o(label, sort_order)
WHERE c.label = 'Doors / Windows / Locks';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Interior damage', 1), ('Seat issue', 2)) AS o(label, sort_order)
WHERE c.label = 'Interior';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Exterior damage (describe)', 1), ('Body panel damage', 2)) AS o(label, sort_order)
WHERE c.label = 'Exterior / Body';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Windshield crack', 1), ('Glass damage', 2)) AS o(label, sort_order)
WHERE c.label = 'Glass';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Deep clean needed', 1), ('Interior detailing', 2), ('Exterior detailing', 3)) AS o(label, sort_order)
WHERE c.label = 'Detailing / Cleanliness';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Needs to be seen before return to service', 1)) AS o(label, sort_order)
WHERE c.label = 'Accident / Collision';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Audio not working', 1), ('Screen / system issue', 2)) AS o(label, sort_order)
WHERE c.label = 'Audio / Infotainment';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Appraisal', 1), ('Inspection appointment', 2), ('Windshield appointment', 3)) AS o(label, sort_order)
WHERE c.label = 'Appointment';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Vehicle must remain at base', 1)) AS o(label, sort_order)
WHERE c.label = 'Must Stay At Base';

INSERT INTO public.maintenance_issue_options (category_id, label, sort_order)
SELECT c.id, o.label, o.sort_order FROM public.maintenance_issue_categories c
CROSS JOIN (VALUES ('Other (free text)', 1)) AS o(label, sort_order)
WHERE c.label = 'Other';
