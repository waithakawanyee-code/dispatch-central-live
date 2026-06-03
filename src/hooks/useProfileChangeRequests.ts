import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type ChangeRequestStatus = "pending" | "approved" | "rejected" | "auto_applied";
export type ChangeRequestType = "contact_update" | "license" | "med_card" | "other_document";

export interface ChangeRequest {
  id: string;
  driver_id: string;
  request_type: ChangeRequestType;
  related_document_id: string | null;
  proposed_changes: Record<string, any>;
  requires_approval: boolean;
  status: ChangeRequestStatus;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

const TABLE = "driver_profile_change_requests";

/** Driver-side: change requests for this driver (license/med_card pending/approved/rejected) */
export function useDriverChangeRequests(driverId: string | undefined) {
  return useQuery({
    queryKey: ["driver_change_requests", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await db
        .from(TABLE)
        .select("*")
        .eq("driver_id", driverId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChangeRequest[];
    },
  });
}

/** Admin: all requests, optionally filtered by status set */
export function useAllChangeRequests(statuses: ChangeRequestStatus[]) {
  return useQuery({
    queryKey: ["all_change_requests", statuses.sort().join(",")],
    queryFn: async () => {
      const { data, error } = await db
        .from(TABLE)
        .select("*")
        .in("status", statuses)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChangeRequest[];
    },
  });
}

/** Admin: count of pending requests, used by widget */
export function usePendingChangeRequestCount() {
  return useQuery({
    queryKey: ["change_requests_pending_count"],
    queryFn: async () => {
      const { count, error } = await db
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

/** Realtime subscription helper — invalidates relevant queries on change */
export function useChangeRequestsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("driver_profile_change_requests_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        () => {
          qc.invalidateQueries({ queryKey: ["all_change_requests"] });
          qc.invalidateQueries({ queryKey: ["change_requests_pending_count"] });
          qc.invalidateQueries({ queryKey: ["driver_change_requests"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useReviewChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; approve: boolean; note?: string }) => {
      const { error } = await (supabase.rpc as any)("review_change_request", {
        p_request_id: args.id,
        p_approve: args.approve,
        p_note: args.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_change_requests"] });
      qc.invalidateQueries({ queryKey: ["change_requests_pending_count"] });
      qc.invalidateQueries({ queryKey: ["driver_change_requests"] });
      qc.invalidateQueries({ queryKey: ["driver_for_profile"] });
    },
  });
}

export async function updateMyProfile(payload: Record<string, unknown>) {
  const { error } = await (supabase.rpc as any)("update_my_driver_profile", { p: payload });
  if (error) throw error;
}
