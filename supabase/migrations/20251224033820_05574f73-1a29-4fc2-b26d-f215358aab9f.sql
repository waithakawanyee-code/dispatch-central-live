-- Create maintenance_issue_templates table for quick-pick menu
CREATE TABLE public.maintenance_issue_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  default_details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_issue_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies - everyone can read active templates, admins can manage
CREATE POLICY "Authenticated users can read active templates"
ON public.maintenance_issue_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.maintenance_issue_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for sorting
CREATE INDEX idx_maintenance_issue_templates_sort ON public.maintenance_issue_templates(sort_order, label);

-- Add updated_at trigger
CREATE TRIGGER update_maintenance_issue_templates_updated_at
BEFORE UPDATE ON public.maintenance_issue_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();