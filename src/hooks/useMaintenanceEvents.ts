import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MaintenanceEvent = Database["public"]["Tables"]["vehicle_maintenance_events"]["Row"];
export type MaintenanceEventInsert = Database["public"]["Tables"]["vehicle_maintenance_events"]["Insert"];
export type MaintenanceEventUpdate = Database["public"]["Tables"]["vehicle_maintenance_events"]["Update"];

export function useMaintenanceEvents(vehicleId?: string) {
  const queryClient = useQueryClient();

  // Fetch all maintenance events for a vehicle
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["maintenance-events", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const { data, error } = await supabase
        .from("vehicle_maintenance_events")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MaintenanceEvent[];
    },
    enabled: !!vehicleId,
  });

  // Get the open event for a vehicle (closed_at IS NULL)
  const openEvent = events.find(e => e.closed_at === null);

  // Check if vehicle has an open maintenance event
  const hasOpenEvent = !!openEvent;

  // Create a new maintenance event with initial issue
  const createEventMutation = useMutation({
    mutationFn: async ({ 
      vehicleId, 
      initialIssueTitle,
      initialIssueDetails,
      expectedBackInServiceAt,
      notes 
    }: { 
      vehicleId: string; 
      initialIssueTitle: string;
      initialIssueDetails?: string;
      expectedBackInServiceAt?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the maintenance event
      const { data: event, error: eventError } = await supabase
        .from("vehicle_maintenance_events")
        .insert({
          vehicle_id: vehicleId,
          notes: notes || null,
          expected_back_in_service_at: expectedBackInServiceAt || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create the initial issue
      const { error: issueError } = await supabase
        .from("vehicle_maintenance_issues")
        .insert({
          maintenance_event_id: event.id,
          title: initialIssueTitle,
          details: initialIssueDetails || null,
          created_by: user?.id || null,
        });

      if (issueError) throw issueError;

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-events"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-issues"] });
    },
  });

  // Update a maintenance event
  const updateEventMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: MaintenanceEventUpdate;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-events"] });
    },
  });

  // Close a maintenance event (return vehicle to service)
  const closeEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance_events")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-events"] });
    },
  });

  return {
    events,
    openEvent,
    hasOpenEvent,
    isLoading,
    createEvent: createEventMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    closeEvent: closeEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isClosing: closeEventMutation.isPending,
  };
}

// Hook to get open event for any vehicle (for checking before creating)
export function useOpenMaintenanceEvent(vehicleId?: string) {
  const { data: openEvent, isLoading } = useQuery({
    queryKey: ["open-maintenance-event", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      
      const { data, error } = await supabase
        .from("vehicle_maintenance_events")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .is("closed_at", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  return { openEvent, isLoading, hasOpenEvent: !!openEvent };
}
