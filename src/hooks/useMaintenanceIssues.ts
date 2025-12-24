import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MaintenanceIssue = Database["public"]["Tables"]["vehicle_maintenance_issues"]["Row"];
export type MaintenanceIssueInsert = Database["public"]["Tables"]["vehicle_maintenance_issues"]["Insert"];
export type MaintenanceIssueUpdate = Database["public"]["Tables"]["vehicle_maintenance_issues"]["Update"];

export function useMaintenanceIssues(maintenanceEventId?: string) {
  const queryClient = useQueryClient();

  // Fetch issues for a specific maintenance event
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["maintenance-issues", maintenanceEventId],
    queryFn: async () => {
      if (!maintenanceEventId) return [];
      
      const { data, error } = await supabase
        .from("vehicle_maintenance_issues")
        .select("*")
        .eq("maintenance_event_id", maintenanceEventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MaintenanceIssue[];
    },
    enabled: !!maintenanceEventId,
  });

  // Create a new issue
  const createIssueMutation = useMutation({
    mutationFn: async (issue: MaintenanceIssueInsert) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance_issues")
        .insert(issue)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-issues", maintenanceEventId] });
    },
  });

  // Update an issue
  const updateIssueMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: MaintenanceIssueUpdate;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance_issues")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-issues", maintenanceEventId] });
    },
  });

  // Delete an issue
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase
        .from("vehicle_maintenance_issues")
        .delete()
        .eq("id", issueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-issues", maintenanceEventId] });
    },
  });

  return {
    issues,
    isLoading,
    createIssue: createIssueMutation.mutateAsync,
    updateIssue: updateIssueMutation.mutateAsync,
    deleteIssue: deleteIssueMutation.mutateAsync,
    isCreating: createIssueMutation.isPending,
    isUpdating: updateIssueMutation.isPending,
    isDeleting: deleteIssueMutation.isPending,
  };
}
