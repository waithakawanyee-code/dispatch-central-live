-- Create status change history table
CREATE TABLE public.status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver', 'vehicle')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- Public read/write for dispatch system
CREATE POLICY "Allow public read access to status_history" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to status_history" ON public.status_history FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_history;

-- Create index for faster queries
CREATE INDEX idx_status_history_changed_at ON public.status_history(changed_at DESC);
CREATE INDEX idx_status_history_entity ON public.status_history(entity_type, entity_id);