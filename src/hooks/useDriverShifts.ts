import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverShift {
  id: string;
  driver_id: string;
  driver_name: string;
  punch_in_at: string;
  punch_out_at: string | null;
  workday_date: string;
  vehicle_unit: string | null;
  notes: string | null;
}

export function useDriverShifts(driverId?: string) {
  const query = useQuery({
    queryKey: ["driver_shifts", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("shifts")
        .select("id, driver_id, driver_name, punch_in_at, punch_out_at, workday_date, vehicle_unit, notes")
        .eq("driver_id", driverId)
        .order("punch_in_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as DriverShift[];
    },
    enabled: !!driverId,
  });

  // Calculate total hours for a given date range
  const getTotalHours = (shifts: DriverShift[]) => {
    return shifts.reduce((total, shift) => {
      if (!shift.punch_out_at) return total;
      const inTime = new Date(shift.punch_in_at).getTime();
      const outTime = new Date(shift.punch_out_at).getTime();
      return total + (outTime - inTime) / (1000 * 60 * 60);
    }, 0);
  };

  return {
    shifts: query.data || [],
    isLoading: query.isLoading,
    getTotalHours,
  };
}
