import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverTimeOff {
  id: string;
  driver_id: string;
  driver_name: string;
  time_off_type: "vacation" | "sick" | "personal" | "fmla";
  start_date: string;
  end_date: string;
  notes: string | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDriverTimeOff(driverId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["driver_time_off", driverId],
    queryFn: async () => {
      let q = supabase
        .from("driver_time_off")
        .select("*")
        .order("start_date", { ascending: false });

      if (driverId) {
        q = q.eq("driver_id", driverId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as DriverTimeOff[];
    },
  });

  const addTimeOff = useMutation({
    mutationFn: async (entry: {
      driver_id: string;
      driver_name: string;
      time_off_type: DriverTimeOff["time_off_type"];
      start_date: string;
      end_date: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("driver_time_off").insert({
        ...entry,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver_time_off"] });
    },
  });

  const updateTimeOff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DriverTimeOff> & { id: string }) => {
      const { error } = await supabase
        .from("driver_time_off")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver_time_off"] });
    },
  });

  const deleteTimeOff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("driver_time_off")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver_time_off"] });
    },
  });

  // Helper: check if a driver has time off on a specific date
  const isDriverOffOnDate = (dId: string, date: string) => {
    if (!query.data) return false;
    return query.data.some(
      (entry) =>
        entry.driver_id === dId &&
        entry.status !== "cancelled" &&
        date >= entry.start_date &&
        date <= entry.end_date
    );
  };

  // Helper: get active time off entries for a driver on a date
  const getTimeOffForDate = (dId: string, date: string) => {
    if (!query.data) return [];
    return query.data.filter(
      (entry) =>
        entry.driver_id === dId &&
        entry.status !== "cancelled" &&
        date >= entry.start_date &&
        date <= entry.end_date
    );
  };

  return {
    timeOffEntries: query.data || [],
    isLoading: query.isLoading,
    addTimeOff,
    updateTimeOff,
    deleteTimeOff,
    isDriverOffOnDate,
    getTimeOffForDate,
  };
}
