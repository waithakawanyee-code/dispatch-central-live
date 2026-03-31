import { useState, useEffect, useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface CallOut {
  id: string;
  driver_id: string;
  driver_name: string;
  call_out_date: string;
  note: string | null;
  is_call_out: boolean;
}

export function useCallOuts() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = format(today, "yyyy-MM-dd");

  const [todayCallOuts, setTodayCallOuts] = useState<CallOut[]>([]);

  const fetchForDate = async (dateStr: string): Promise<CallOut[]> => {
    const { data } = await supabase.from("call_outs").select("*").eq("call_out_date", dateStr);
    return (data || []) as CallOut[];
  };

  const refreshToday = async () => {
    const data = await fetchForDate(todayStr);
    setTodayCallOuts(data);
  };

  useEffect(() => { refreshToday(); }, []);

  // Mark one or more drivers off (bulk insert)
  const markDriversOff = async (insertData: Omit<CallOut, "id">[]): Promise<{ error: any }> => {
    const { error } = await supabase.from("call_outs").insert(insertData);
    if (!error) await refreshToday();
    return { error };
  };

  // Remove a call-out record for a driver on a specific date
  const removeCallOut = async (driverId: string, dateStr: string): Promise<{ error: any }> => {
    const { error } = await supabase.from("call_outs").delete()
      .eq("driver_id", driverId).eq("call_out_date", dateStr);
    if (!error && dateStr === todayStr) await refreshToday();
    return { error };
  };

  return { todayCallOuts, setTodayCallOuts, fetchForDate, refreshToday, markDriversOff, removeCallOut };
}
