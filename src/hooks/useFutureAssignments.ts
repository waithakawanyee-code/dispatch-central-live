import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FutureAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  assignment_date: string;
  report_time: string | null;
  vehicle: string | null;
}

export function useFutureAssignments() {
  const [assignments, setAssignments] = useState<FutureAssignment[]>([]);

  const fetchForDate = async (dateStr: string) => {
    const { data } = await supabase.from("future_assignments").select("*").eq("assignment_date", dateStr);
    setAssignments((data || []) as FutureAssignment[]);
  };

  const assign = async (
    driverId: string, driverName: string, dateStr: string,
    reportTime: string | null, vehicle: string | null, createdBy: string | null
  ): Promise<{ data: FutureAssignment | null; error: any }> => {
    const { data, error } = await supabase.from("future_assignments").insert({
      driver_id: driverId, driver_name: driverName, assignment_date: dateStr,
      report_time: reportTime || null,
      vehicle: vehicle === "__none__" ? null : vehicle,
      created_by: createdBy,
    }).select().single();
    if (!error && data) setAssignments(prev => [...prev, data as FutureAssignment]);
    return { data: data as FutureAssignment | null, error };
  };

  const unassign = async (driverId: string, dateStr: string): Promise<{ error: any }> => {
    const { error } = await supabase.from("future_assignments").delete()
      .eq("driver_id", driverId).eq("assignment_date", dateStr);
    if (!error) setAssignments(prev => prev.filter(a => a.driver_id !== driverId));
    return { error };
  };

  return { assignments, setAssignments, fetchForDate, assign, unassign };
}
