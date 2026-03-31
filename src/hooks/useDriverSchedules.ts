import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DriverSchedule = Database["public"]["Tables"]["driver_schedules"]["Row"];

export function useDriverSchedules() {
  const [schedules, setSchedules] = useState<DriverSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data } = await supabase.from("driver_schedules").select("*");
    if (data) setSchedules(data);
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, []);

  // For Scheduler.tsx: mark a driver's schedule slot as off
  const markScheduleOff = async (driverId: string, dayOfWeek: number): Promise<{ error: any }> => {
    const existing = schedules.find(s => s.driver_id === driverId && s.day_of_week === dayOfWeek);
    if (existing) {
      const { error } = await supabase
        .from("driver_schedules")
        .update({ is_off: true, start_time: null, end_time: null })
        .eq("id", existing.id);
      if (!error) await fetchSchedules();
      return { error };
    } else {
      const { error } = await supabase
        .from("driver_schedules")
        .insert({ driver_id: driverId, day_of_week: dayOfWeek, is_off: true, start_time: null, end_time: null });
      if (!error) await fetchSchedules();
      return { error };
    }
  };

  // For Scheduler.tsx: restore a driver's schedule slot from off
  const restoreFromOff = async (driverId: string, dayOfWeek: number): Promise<{ error: any }> => {
    const existing = schedules.find(s => s.driver_id === driverId && s.day_of_week === dayOfWeek);
    if (!existing) return { error: new Error("Schedule not found") };
    const { error } = await supabase
      .from("driver_schedules")
      .update({ is_off: false })
      .eq("id", existing.id);
    if (!error) await fetchSchedules();
    return { error };
  };

  return { schedules, loading, fetchSchedules, markScheduleOff, restoreFromOff };
}
