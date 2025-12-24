-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_parts', 'closed');

-- Create vehicle_service_tickets table
CREATE TABLE public.vehicle_service_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  ticket_status public.ticket_status NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.maintenance_category NOT NULL DEFAULT 'other',
  priority public.maintenance_priority NOT NULL DEFAULT 'medium',
  requested_by_user_id UUID REFERENCES auth.users(id),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  estimated_completion_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.vehicle_service_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read service tickets"
  ON public.vehicle_service_tickets
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service tickets"
  ON public.vehicle_service_tickets
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service tickets"
  ON public.vehicle_service_tickets
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service tickets"
  ON public.vehicle_service_tickets
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_service_tickets_vehicle_id ON public.vehicle_service_tickets(vehicle_id);
CREATE INDEX idx_service_tickets_status ON public.vehicle_service_tickets(ticket_status);
CREATE INDEX idx_service_tickets_priority ON public.vehicle_service_tickets(priority);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_service_tickets;