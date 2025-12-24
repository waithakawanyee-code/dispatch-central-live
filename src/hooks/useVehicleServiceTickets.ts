import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type MaintenanceCategory = Database["public"]["Enums"]["maintenance_category"];
export type MaintenancePriority = Database["public"]["Enums"]["maintenance_priority"];

export type ServiceTicket = Database["public"]["Tables"]["vehicle_service_tickets"]["Row"];
export type ServiceTicketInsert = Database["public"]["Tables"]["vehicle_service_tickets"]["Insert"];

export interface VehicleTicketCount {
  vehicle_id: string;
  open_ticket_count: number;
}

export function useVehicleServiceTickets() {
  const queryClient = useQueryClient();

  // Fetch all service tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["vehicle-service-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_service_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ServiceTicket[];
    },
  });

  // Calculate open ticket counts per vehicle
  const openTicketCounts: Map<string, number> = new Map();
  tickets.forEach((ticket) => {
    if (ticket.ticket_status !== "closed") {
      const current = openTicketCounts.get(ticket.vehicle_id) || 0;
      openTicketCounts.set(ticket.vehicle_id, current + 1);
    }
  });

  // Get open ticket count for a specific vehicle
  const getOpenTicketCount = (vehicleId: string): number => {
    return openTicketCounts.get(vehicleId) || 0;
  };

  // Get tickets for a specific vehicle
  const getVehicleTickets = (vehicleId: string): ServiceTicket[] => {
    return tickets.filter((t) => t.vehicle_id === vehicleId);
  };

  // Get open tickets for a specific vehicle
  const getOpenVehicleTickets = (vehicleId: string): ServiceTicket[] => {
    return tickets.filter(
      (t) => t.vehicle_id === vehicleId && t.ticket_status !== "closed"
    );
  };

  // Create a new service ticket
  const createTicketMutation = useMutation({
    mutationFn: async (ticket: ServiceTicketInsert) => {
      const { data, error } = await supabase
        .from("vehicle_service_tickets")
        .insert(ticket)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-service-tickets"] });
    },
  });

  // Update a service ticket
  const updateTicketMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ServiceTicket>;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_service_tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-service-tickets"] });
    },
  });

  // Close a ticket
  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase
        .from("vehicle_service_tickets")
        .update({
          ticket_status: "closed" as TicketStatus,
          closed_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-service-tickets"] });
    },
  });

  return {
    tickets,
    ticketsLoading,
    getOpenTicketCount,
    getVehicleTickets,
    getOpenVehicleTickets,
    createTicket: createTicketMutation.mutateAsync,
    updateTicket: updateTicketMutation.mutateAsync,
    closeTicket: closeTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    isUpdating: updateTicketMutation.isPending,
    isClosing: closeTicketMutation.isPending,
  };
}
