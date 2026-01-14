import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, parseISO } from "date-fns";

export interface Shift {
  id: string;
  driver_id: string;
  driver_name: string;
  punch_in_at: string;
  punch_out_at: string | null;
  workday_date: string;
  workday_override: boolean;
  workday_override_reason: string | null;
  workday_override_by: string | null;
  workday_override_at: string | null;
  vehicle_unit: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  notes: string | null;
  exception_flags: Record<string, unknown>;
}

export interface ShiftVehicleSegment {
  id: string;
  shift_id: string;
  vehicle_id: string | null;
  vehicle_unit: string;
  segment_in_at: string;
  segment_out_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Workday {
  workday_date: string;
  status: "open" | "closed";
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
}

// New status model
export type ShiftDriverStatus = "unconfirmed" | "confirmed" | "on_the_clock" | "done";

export function useShifts(selectedWorkday: Date = new Date()) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [vehicleSegments, setVehicleSegments] = useState<ShiftVehicleSegment[]>([]);
  const [workday, setWorkday] = useState<Workday | null>(null);
  const [loading, setLoading] = useState(true);

  const workdayDateStr = format(startOfDay(selectedWorkday), "yyyy-MM-dd");

  // Fetch shifts for selected workday
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    
    const [shiftsRes, workdayRes] = await Promise.all([
      supabase
        .from("shifts")
        .select("*")
        .eq("workday_date", workdayDateStr)
        .order("punch_in_at", { ascending: true }),
      supabase
        .from("workdays")
        .select("*")
        .eq("workday_date", workdayDateStr)
        .maybeSingle(),
    ]);

    if (shiftsRes.data) {
      setShifts(shiftsRes.data as unknown as Shift[]);
      
      // Fetch vehicle segments for these shifts
      if (shiftsRes.data.length > 0) {
        const shiftIds = shiftsRes.data.map(s => s.id);
        const { data: segmentsData } = await supabase
          .from("shift_vehicle_segments")
          .select("*")
          .in("shift_id", shiftIds)
          .order("segment_in_at", { ascending: true });
        
        if (segmentsData) {
          setVehicleSegments(segmentsData as unknown as ShiftVehicleSegment[]);
        }
      } else {
        setVehicleSegments([]);
      }
    }
    
    if (workdayRes.data) {
      setWorkday(workdayRes.data as Workday);
    } else {
      setWorkday(null);
    }
    
    setLoading(false);
  }, [workdayDateStr]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`shifts-${workdayDateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newShift = payload.new as unknown as Shift;
            if (newShift.workday_date === workdayDateStr) {
              setShifts(prev => [...prev, newShift]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedShift = payload.new as unknown as Shift;
            setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
          } else if (payload.eventType === "DELETE") {
            setShifts(prev => prev.filter(s => s.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_vehicle_segments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setVehicleSegments(prev => [...prev, payload.new as unknown as ShiftVehicleSegment]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as unknown as ShiftVehicleSegment;
            setVehicleSegments(prev => prev.map(s => s.id === updated.id ? updated : s));
          } else if (payload.eventType === "DELETE") {
            setVehicleSegments(prev => prev.filter(s => s.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workdayDateStr]);

  // Get open shift for a driver (any workday)
  const getOpenShiftForDriver = useCallback(async (driverId: string): Promise<Shift | null> => {
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("driver_id", driverId)
      .is("punch_out_at", null)
      .order("punch_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    return data as unknown as Shift | null;
  }, []);

  // Get driver status for selected workday using new status model
  const getDriverStatusForWorkday = useCallback((driverId: string): { status: ShiftDriverStatus; shift: Shift | null } => {
    const driverShifts = shifts.filter(s => s.driver_id === driverId);
    
    if (driverShifts.length === 0) {
      return { status: "unconfirmed", shift: null };
    }
    
    // Check for open shift
    const openShift = driverShifts.find(s => !s.punch_out_at);
    if (openShift) {
      return { status: "on_the_clock", shift: openShift };
    }
    
    // Has closed shifts for this workday
    const latestShift = driverShifts[driverShifts.length - 1];
    return { status: "done", shift: latestShift };
  }, [shifts]);

  // Punch in a driver - creates new shift
  const punchIn = useCallback(async (
    driverId: string,
    driverName: string,
    punchInTime?: string, // ISO string or HH:MM
    vehicle?: string,
    overrideWorkday?: Date,
    overrideReason?: string
  ): Promise<{ success: boolean; shiftId?: string; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Build punch in timestamp
    let punchInAt: string;
    if (punchInTime && /^\d{2}:\d{2}$/.test(punchInTime)) {
      const today = new Date(selectedWorkday);
      const [hours, minutes] = punchInTime.split(":").map(Number);
      today.setHours(hours, minutes, 0, 0);
      punchInAt = today.toISOString();
    } else if (punchInTime) {
      punchInAt = punchInTime;
    } else {
      punchInAt = new Date().toISOString();
    }

    // Determine workday date
    let workdayDate = workdayDateStr;
    const punchHour = new Date(punchInAt).getHours();
    
    if (overrideWorkday) {
      workdayDate = format(startOfDay(overrideWorkday), "yyyy-MM-dd");
    }

    // Create the shift
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        driver_id: driverId,
        driver_name: driverName,
        punch_in_at: punchInAt,
        workday_date: workdayDate,
        workday_override: !!overrideWorkday || punchHour >= 22,
        workday_override_reason: overrideReason || (punchHour >= 22 ? "Late night shift override" : null),
        workday_override_by: overrideWorkday ? user?.id : null,
        workday_override_at: overrideWorkday ? new Date().toISOString() : null,
        vehicle_unit: vehicle || null,
        created_by: user?.id || null,
        exception_flags: {},
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // ✅ Keep drivers table in sync for UI + status chips
    const { error: driverUpdateError } = await supabase
      .from("drivers")
      .update({
        status: "on_the_clock",
        vehicle: vehicle || null,
      })
      .eq("id", driverId);
    
    if (driverUpdateError) {
      console.error("Error updating driver row on punch in:", driverUpdateError);
    }

    // ✅ Keep vehicles table in sync - set driver name on the vehicle
    if (vehicle) {
      const { error: vehicleUpdateError } = await supabase
        .from("vehicles")
        .update({ driver: driverName })
        .eq("unit", vehicle);
      
      if (vehicleUpdateError) {
        console.error("Error updating vehicle driver on punch in:", vehicleUpdateError);
      }
    }

    // Create initial vehicle segment if vehicle assigned
    if (vehicle && data) {
      // Find vehicle ID
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("id")
        .eq("unit", vehicle)
        .maybeSingle();

      await supabase.from("shift_vehicle_segments").insert({
        shift_id: data.id,
        vehicle_id: vehicleData?.id || null,
        vehicle_unit: vehicle,
        segment_in_at: punchInAt,
        created_by: user?.id || null,
      });
    }

    // Log to status_history
    await supabase.from("status_history").insert({
      entity_type: "driver",
      entity_id: driverId,
      entity_name: driverName,
      field_changed: "shift_punch_in",
      old_value: null,
      new_value: `Shift started at ${format(new Date(punchInAt), "HH:mm")}`,
    });

    return { success: true, shiftId: data.id };
  }, [selectedWorkday, workdayDateStr]);

  // Auto-close previous shift and punch in
  const autoClosePreviousAndPunchIn = useCallback(async (
    driverId: string,
    driverName: string,
    previousShift: Shift,
    punchInTime?: string,
    vehicle?: string
  ): Promise<{ success: boolean; shiftId?: string; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Build punch in timestamp
    let punchInAt: string;
    if (punchInTime && /^\d{2}:\d{2}$/.test(punchInTime)) {
      const today = new Date(selectedWorkday);
      const [hours, minutes] = punchInTime.split(":").map(Number);
      today.setHours(hours, minutes, 0, 0);
      punchInAt = today.toISOString();
    } else if (punchInTime) {
      punchInAt = punchInTime;
    } else {
      punchInAt = new Date().toISOString();
    }

    // Close the previous shift
    const { error: closeError } = await supabase
      .from("shifts")
      .update({
        punch_out_at: punchInAt,
        updated_by: user?.id || null,
        exception_flags: {
          ...previousShift.exception_flags,
          auto_closed_by_new_shift: true,
          auto_closed_at: new Date().toISOString(),
        },
      })
      .eq("id", previousShift.id);

    if (closeError) {
      return { success: false, error: closeError.message };
    }

    // Close any open vehicle segments on that shift
    await supabase
      .from("shift_vehicle_segments")
      .update({ segment_out_at: punchInAt })
      .eq("shift_id", previousShift.id)
      .is("segment_out_at", null);

    // Now punch in to new shift with exception flag
    const result = await punchIn(driverId, driverName, punchInTime, vehicle);
    
    if (result.success && result.shiftId) {
      // Add exception flag for auto-closed previous shift
      await supabase
        .from("shifts")
        .update({
          exception_flags: {
            auto_closed_prev_shift: true,
            prev_shift_id: previousShift.id,
            prev_shift_workday: previousShift.workday_date,
          },
        })
        .eq("id", result.shiftId);
    }

    // Log the auto-close
    await supabase.from("status_history").insert({
      entity_type: "driver",
      entity_id: driverId,
      entity_name: driverName,
      field_changed: "shift_auto_closed",
      old_value: `Open shift from ${previousShift.workday_date}`,
      new_value: `Auto-closed at ${format(new Date(punchInAt), "HH:mm")} for new shift`,
    });

    return result;
  }, [punchIn, selectedWorkday]);

  // Punch out a driver
  const punchOut = useCallback(async (
    shiftId: string,
    punchOutTime?: string // ISO string or HH:MM
  ): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
  
    // Always resolve the shift from DB to avoid stale UI state
    const { data: shift, error: shiftLookupError } = await supabase
      .from("shifts")
      .select("id, driver_id, driver_name, punch_in_at, punch_out_at, workday_date, exception_flags, vehicle_unit")
      .eq("id", shiftId)
      .maybeSingle();
  
    if (shiftLookupError) {
      return { success: false, error: shiftLookupError.message };
    }
  
    if (!shift || shift.punch_out_at) {
      return { success: false, error: "Driver needs to be punched in first" };
    }

     // Build punch out timestamp
    let punchOutAt: string;
    if (punchOutTime && /^\d{2}:\d{2}$/.test(punchOutTime)) {
      const shiftDate = parseISO(shift.punch_in_at);
      const [hours, minutes] = punchOutTime.split(":").map(Number);
      shiftDate.setHours(hours, minutes, 0, 0);
      punchOutAt = shiftDate.toISOString();
    } else if (punchOutTime) {
      punchOutAt = punchOutTime;
    } else {
      punchOutAt = new Date().toISOString();
    }

    // Validate punch out is after punch in
    if (new Date(punchOutAt) <= new Date(shift.punch_in_at)) {
      return { success: false, error: "Punch out time must be after punch in time" };
    }

    // Update the shift
    const { error } = await supabase
      .from("shifts")
      .update({
        punch_out_at: punchOutAt,
        updated_by: user?.id || null,
      })
      .eq("id", shiftId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Update driver status to done
    await supabase
      .from("drivers")
      .update({
        status: "done",
        vehicle: null,
      })
      .eq("id", shift.driver_id);

    // ✅ Update vehicle: clear driver and mark dirty for non-take-home vehicles
    if (shift.vehicle_unit) {
      // Get the vehicle to check classification
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("id, classification, primary_category, always_clean_exempt, clean_status")
        .eq("unit", shift.vehicle_unit)
        .maybeSingle();

      if (vehicleData) {
        const isFleetVehicle = vehicleData.classification === "fleet";
        const isAboveAll = vehicleData.primary_category === "above_all";
        const isNotExempt = !vehicleData.always_clean_exempt;
        const now = new Date().toISOString();

        // For non-take-home vehicles: clear driver AND mark dirty
        if (isFleetVehicle) {
          const updateData: Record<string, unknown> = { driver: null };
          
          // Mark dirty if above_all and not exempt
          if (isAboveAll && isNotExempt) {
            updateData.clean_status = "dirty";
            updateData.dirty_reason = "PUNCH_OUT_NON_TAKE_HOME";
            updateData.last_marked_dirty_at = now;
            updateData.clean_status_updated_at = now;
            updateData.clean_status_source = "automation";
          }

          const { error: vehicleUpdateError } = await supabase
            .from("vehicles")
            .update(updateData)
            .eq("id", vehicleData.id);

          if (vehicleUpdateError) {
            console.error("Error updating vehicle on punch out:", vehicleUpdateError);
          } else if (isAboveAll && isNotExempt) {
            // Log the dirty status event
            await supabase.from("vehicle_status_events").insert({
              vehicle_id: vehicleData.id,
              event_type: "CLEAN_STATUS_PUNCH_OUT",
              occurred_at: now,
              source: "automation",
              payload_json: {
                previous_status: vehicleData.clean_status,
                new_status: "dirty",
                reason: "PUNCH_OUT_NON_TAKE_HOME",
                classification: vehicleData.classification,
              },
              idempotency_key: `punch_out_${vehicleData.id}_${now.replace(/[:.]/g, "_")}`,
            });

            await supabase.from("status_history").insert({
              entity_type: "vehicle",
              entity_id: vehicleData.id,
              entity_name: shift.vehicle_unit,
              field_changed: "clean_status",
              old_value: vehicleData.clean_status,
              new_value: "dirty",
            });
          }
        } else {
          // Take-home vehicles: just clear the driver assignment (owner remains)
          await supabase
            .from("vehicles")
            .update({ driver: null })
            .eq("id", vehicleData.id);
        }
      }
    }

    // Close any open vehicle segments
    await supabase
      .from("shift_vehicle_segments")
      .update({ segment_out_at: punchOutAt })
      .eq("shift_id", shiftId)
      .is("segment_out_at", null);

    // Log to status_history
    await supabase.from("status_history").insert({
      entity_type: "driver",
      entity_id: shift.driver_id,
      entity_name: shift.driver_name,
      field_changed: "shift_punch_out",
      old_value: `Working since ${format(new Date(shift.punch_in_at), "HH:mm")}`,
      new_value: `Punched out at ${format(new Date(punchOutAt), "HH:mm")}`,
    });

    return { success: true };
  }, []);

  // Change vehicle during shift (ends current segment, starts new)
  const changeVehicle = useCallback(async (
    shiftId: string,
    newVehicle: string,
    changeTime?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      return { success: false, error: "Shift not found" };
    }

    if (shift.punch_out_at) {
      return { success: false, error: "Cannot change vehicle on closed shift" };
    }

    // Build change timestamp
    let changeAt: string;
    if (changeTime && /^\d{2}:\d{2}$/.test(changeTime)) {
      const shiftDate = parseISO(shift.punch_in_at);
      const [hours, minutes] = changeTime.split(":").map(Number);
      shiftDate.setHours(hours, minutes, 0, 0);
      changeAt = shiftDate.toISOString();
    } else if (changeTime) {
      changeAt = changeTime;
    } else {
      changeAt = new Date().toISOString();
    }

    // Close current open segment
    await supabase
      .from("shift_vehicle_segments")
      .update({ segment_out_at: changeAt })
      .eq("shift_id", shiftId)
      .is("segment_out_at", null);

    // Find vehicle ID
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("id")
      .eq("unit", newVehicle)
      .maybeSingle();

    // Create new segment
    const { error } = await supabase
      .from("shift_vehicle_segments")
      .insert({
        shift_id: shiftId,
        vehicle_id: vehicleData?.id || null,
        vehicle_unit: newVehicle,
        segment_in_at: changeAt,
        created_by: user?.id || null,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update shift's current vehicle
    await supabase
      .from("shifts")
      .update({ vehicle_unit: newVehicle, updated_by: user?.id })
      .eq("id", shiftId);

    return { success: true };
  }, [shifts]);

  // Force close shift (admin only)
  const forceCloseShift = useCallback(async (
    shiftId: string,
    punchOutTime: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      return { success: false, error: "Shift not found" };
    }

    if (shift.punch_out_at) {
      return { success: false, error: "Shift is already closed" };
    }

    // Build punch out timestamp
    let punchOutAt: string;
    if (/^\d{2}:\d{2}$/.test(punchOutTime)) {
      const shiftDate = parseISO(shift.punch_in_at);
      const [hours, minutes] = punchOutTime.split(":").map(Number);
      shiftDate.setHours(hours, minutes, 0, 0);
      punchOutAt = shiftDate.toISOString();
    } else {
      punchOutAt = punchOutTime;
    }

    // Update the shift with force close flags
    const { error } = await supabase
      .from("shifts")
      .update({
        punch_out_at: punchOutAt,
        workday_override: true,
        workday_override_reason: reason,
        workday_override_by: user?.id,
        workday_override_at: new Date().toISOString(),
        updated_by: user?.id,
        exception_flags: {
          ...shift.exception_flags,
          force_closed: true,
          force_closed_reason: reason,
          force_closed_at: new Date().toISOString(),
        },
      })
      .eq("id", shiftId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Update driver status to done
    await supabase
      .from("drivers")
      .update({
        status: "done",
        vehicle: null,
      })
      .eq("id", shift.driver_id);

    // ✅ Update vehicle: clear driver for fleet vehicles on force close
    if (shift.vehicle_unit) {
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("id, classification")
        .eq("unit", shift.vehicle_unit)
        .maybeSingle();

      if (vehicleData && vehicleData.classification === "fleet") {
        await supabase
          .from("vehicles")
          .update({ driver: null })
          .eq("id", vehicleData.id);
      }
    }

    // Close any open vehicle segments
    await supabase
      .from("shift_vehicle_segments")
      .update({ segment_out_at: punchOutAt })
      .eq("shift_id", shiftId)
      .is("segment_out_at", null);

    // Log to status_history
    await supabase.from("status_history").insert({
      entity_type: "driver",
      entity_id: shift.driver_id,
      entity_name: shift.driver_name,
      field_changed: "shift_force_closed",
      old_value: `Open shift from ${shift.workday_date}`,
      new_value: `Force closed: ${reason}`,
    });

    return { success: true };
  }, [shifts]);

  // Close out workday
  const closeOutWorkday = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if workday record exists
    if (workday) {
      // Update existing
      const { error } = await supabase
        .from("workdays")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq("workday_date", workdayDateStr);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new closed workday
      const { error } = await supabase
        .from("workdays")
        .insert({
          workday_date: workdayDateStr,
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await fetchShifts();
    return { success: true };
  }, [workday, workdayDateStr, fetchShifts]);

  // Get segments for a shift
  const getSegmentsForShift = useCallback((shiftId: string): ShiftVehicleSegment[] => {
    return vehicleSegments.filter(s => s.shift_id === shiftId);
  }, [vehicleSegments]);

  // Check if punch time is after 10pm
  const isPunchTimeAfter10PM = (time: string): boolean => {
    if (/^\d{2}:\d{2}$/.test(time)) {
      const [hours] = time.split(":").map(Number);
      return hours >= 22;
    }
    return false;
  };

  return {
    shifts,
    vehicleSegments,
    workday,
    loading,
    fetchShifts,
    getOpenShiftForDriver,
    getDriverStatusForWorkday,
    punchIn,
    autoClosePreviousAndPunchIn,
    punchOut,
    changeVehicle,
    forceCloseShift,
    closeOutWorkday,
    getSegmentsForShift,
    isPunchTimeAfter10PM,
  };
}
