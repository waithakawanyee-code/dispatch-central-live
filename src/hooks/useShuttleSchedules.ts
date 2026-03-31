import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShuttleSchedule {
  id: string;
  driver_id: string;
  program: "amtrak" | "bph";
  day_of_week: number;
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
}

const AMTRAK_SHIFT_TIMES = [
  { number: 1, start: "03:00", end: "11:00" },
  { number: 2, start: "11:00", end: "19:00" },
  { number: 3, start: "19:00", end: "03:00" },
];

export function useShuttleSchedules() {
  const [shuttleSchedules, setShuttleSchedules] = useState<ShuttleSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data } = await supabase.from("shuttle_schedules").select("*");
    if (data) setShuttleSchedules(data as ShuttleSchedule[]);
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, []);

  // Scheduler.tsx: assign a driver to an Amtrak shift slot (null = unassign)
  const assignAmtrakShift = async (driverId: string | null, dayOfWeek: number, shiftNumber: number): Promise<{ error: any }> => {
    await supabase.from("shuttle_schedules").delete()
      .eq("program", "amtrak").eq("day_of_week", dayOfWeek).eq("shift_number", shiftNumber);
    if (driverId) {
      const times = AMTRAK_SHIFT_TIMES.find(s => s.number === shiftNumber);
      const { error } = await supabase.from("shuttle_schedules").insert({
        driver_id: driverId, program: "amtrak", day_of_week: dayOfWeek,
        shift_number: shiftNumber, start_time: times?.start || null, end_time: times?.end || null,
      });
      if (error) return { error };
    }
    await fetchSchedules();
    return { error: null };
  };

  // Scheduler.tsx: assign a driver to a BPH shift slot (null = unassign)
  const assignBphShift = async (driverId: string | null, dayOfWeek: number, startTime: string, endTime: string): Promise<{ error: any }> => {
    await supabase.from("shuttle_schedules").delete().eq("program", "bph").eq("day_of_week", dayOfWeek);
    if (driverId) {
      const { error } = await supabase.from("shuttle_schedules").insert({
        driver_id: driverId, program: "bph", day_of_week: dayOfWeek,
        shift_number: 1, start_time: startTime || null, end_time: endTime || null,
      });
      if (error) return { error };
    }
    await fetchSchedules();
    return { error: null };
  };

  // Scheduler.tsx: update BPH shift times only
  const updateBphShiftTimes = async (dayOfWeek: number, startTime: string, endTime: string): Promise<{ error: any }> => {
    const { error } = await supabase.from("shuttle_schedules")
      .update({ start_time: startTime, end_time: endTime })
      .eq("program", "bph").eq("day_of_week", dayOfWeek);
    if (!error) await fetchSchedules();
    return { error };
  };

  // ShuttleSchedules.tsx: save entire Amtrak weekly schedule (delete all + bulk insert)
  const saveAmtrakWeeklySchedule = async (amtrakSchedule: Record<string, string | null>): Promise<{ error: any }> => {
    await supabase.from("shuttle_schedules").delete().eq("program", "amtrak");
    const inserts: any[] = [];
    for (const [key, driverId] of Object.entries(amtrakSchedule)) {
      if (driverId) {
        const [dayStr, shiftStr] = key.split("-");
        const shiftNumber = parseInt(shiftStr);
        const times = AMTRAK_SHIFT_TIMES.find(s => s.number === shiftNumber);
        inserts.push({
          driver_id: driverId, program: "amtrak", day_of_week: parseInt(dayStr),
          shift_number: shiftNumber, start_time: times?.start || null, end_time: times?.end || null,
        });
      }
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from("shuttle_schedules").insert(inserts);
      if (error) return { error };
    }
    await fetchSchedules();
    return { error: null };
  };

  // ShuttleSchedules.tsx: save entire BPH weekly schedule (delete all + bulk insert)
  const saveBphWeeklySchedule = async (bphSchedule: Record<string, { driverId: string | null; startTime: string; endTime: string }>): Promise<{ error: any }> => {
    await supabase.from("shuttle_schedules").delete().eq("program", "bph");
    const inserts: any[] = [];
    for (const [dayStr, data] of Object.entries(bphSchedule)) {
      if (data.driverId) {
        inserts.push({
          driver_id: data.driverId, program: "bph", day_of_week: parseInt(dayStr),
          shift_number: 1, start_time: data.startTime || null, end_time: data.endTime || null,
        });
      }
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from("shuttle_schedules").insert(inserts);
      if (error) return { error };
    }
    await fetchSchedules();
    return { error: null };
  };

  return {
    shuttleSchedules, loading, fetchSchedules,
    assignAmtrakShift, assignBphShift, updateBphShiftTimes,
    saveAmtrakWeeklySchedule, saveBphWeeklySchedule,
  };
}
