import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting daily driver status reset and shift cleanup...");

    // ============================================
    // PHASE 1: Close stale shifts (2+ days old)
    // ============================================
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(23, 59, 59, 999);
    const twoDaysAgoStr = twoDaysAgo.toISOString();

    const { data: staleShifts, error: staleShiftsError } = await supabase
      .from("shifts")
      .select("id, driver_id, driver_name, punch_in_at, workday_date, exception_flags")
      .is("punch_out_at", null)
      .lt("punch_in_at", twoDaysAgoStr);

    if (staleShiftsError) {
      console.error("Error fetching stale shifts:", staleShiftsError);
    } else if (staleShifts && staleShifts.length > 0) {
      console.log(`Found ${staleShifts.length} stale open shift(s) from 2+ days ago`);

      for (const shift of staleShifts) {
        // Close at midnight of the day after the shift's workday_date
        const shiftDate = new Date(shift.workday_date);
        shiftDate.setDate(shiftDate.getDate() + 1);
        shiftDate.setHours(0, 0, 0, 0);
        const closeTime = shiftDate.toISOString();

        const { error: updateError } = await supabase
          .from("shifts")
          .update({
            punch_out_at: closeTime,
            exception_flags: {
              ...(shift.exception_flags || {}),
              auto_closed_stale: true,
              auto_closed_by_system: true,
              auto_closed_at: new Date().toISOString(),
              auto_close_reason: "Shift open for 2+ days - auto-closed by daily reset",
            },
          })
          .eq("id", shift.id);

        if (updateError) {
          console.error(`Error closing stale shift ${shift.id}:`, updateError);
        } else {
          console.log(`Auto-closed stale shift for ${shift.driver_name} (${shift.workday_date})`);

          await supabase
            .from("shift_vehicle_segments")
            .update({ segment_out_at: closeTime })
            .eq("shift_id", shift.id)
            .is("segment_out_at", null);

          await supabase.from("status_history").insert({
            entity_type: "driver",
            entity_id: shift.driver_id,
            entity_name: shift.driver_name,
            field_changed: "shift_auto_closed_stale",
            old_value: `Open since ${shift.punch_in_at}`,
            new_value: `Auto-closed (stale shift from ${shift.workday_date})`,
          });
        }
      }
    } else {
      console.log("No stale shifts found to close");
    }

    // ============================================
    // PHASE 1B: Identify currently OPEN (active) shifts
    // Exclude these drivers from reset so you don't break live shifts
    // ============================================
    const { data: openShiftsNow, error: openShiftsNowError } = await supabase
      .from("shifts")
      .select("driver_id, driver_name, punch_in_at, workday_date")
      .is("punch_out_at", null);

    if (openShiftsNowError) {
      console.error("Error fetching currently open shifts:", openShiftsNowError);
    }

    const activeShiftDriverIds = new Set<string>();
    (openShiftsNow || []).forEach((s) => {
      if (s.driver_id) activeShiftDriverIds.add(s.driver_id);
    });

    if (activeShiftDriverIds.size > 0) {
      console.log(`Excluding ${activeShiftDriverIds.size} driver(s) with open shifts from reset`);
    }

    // ============================================
    // PHASE 2: Reset driver statuses (fixed logic)
    // ============================================

    const todayDayOfWeek = new Date().getDay();
    console.log(`Today is day of week: ${todayDayOfWeek}`);

    // 1) Pull take-home vehicle units (so we can detect take-home owners by default_vehicle)
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("unit, classification")
      .eq("classification", "take_home");

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
      throw vehiclesError;
    }

    const takeHomeVehicleUnits = new Set<string>((vehicles || []).map((v) => v.unit).filter(Boolean));

    // 2) Pull today's schedules: IMPORTANT change — missing schedule => NOT scheduled (OFF)
    const { data: todaySchedules, error: schedulesError } = await supabase
      .from("driver_schedules")
      .select("driver_id, is_off")
      .eq("day_of_week", todayDayOfWeek);

    if (schedulesError) {
      console.error("Error fetching today schedules:", schedulesError);
      throw schedulesError;
    }

    // driver_id -> workingToday boolean
    // workingToday = schedule exists AND is_off !== true
    const workingTodayMap = new Map<string, boolean>();
    (todaySchedules || []).forEach((s) => {
      workingTodayMap.set(s.driver_id, s.is_off === true ? false : true);
    });

    // 3) Get all drivers that are not status=off (and we will exclude active-shift drivers)
    const { data: allDrivers, error: allDriversError } = await supabase
      .from("drivers")
      .select("id, name, status, default_vehicle, vehicle")
      .neq("status", "off");

    if (allDriversError) {
      console.error("Error fetching drivers:", allDriversError);
      throw allDriversError;
    }

    const eligibleDrivers = (allDrivers || []).filter((d) => !activeShiftDriverIds.has(d.id));

    // 4) Split drivers into buckets
    const takeHomeWorkingIds: string[] = [];
    const takeHomeWorkingVehicleById = new Map<string, string>();

    const toUnassignIds: string[] = [];

    for (const d of eligibleDrivers) {
      const dv = (d.default_vehicle || "").trim();
      const isTakeHomeOwner = dv !== "" && takeHomeVehicleUnits.has(dv);

      const workingToday = workingTodayMap.get(d.id) === true; // missing => false

      if (isTakeHomeOwner && workingToday) {
        takeHomeWorkingIds.push(d.id);
        takeHomeWorkingVehicleById.set(d.id, dv);
      } else {
        // Everyone else starts unassigned (including take-home owners who are NOT scheduled today)
        toUnassignIds.push(d.id);
      }
    }

    // 5) Bulk updates
    let totalUnassigned = 0;
    let totalAssigned = 0;

    if (toUnassignIds.length > 0) {
      const { data: unassignedDrivers, error: unassignError } = await supabase
        .from("drivers")
        .update({ status: "unassigned", vehicle: null })
        .in("id", toUnassignIds)
        .select("id, name");

      if (unassignError) {
        console.error("Error resetting drivers to unassigned:", unassignError);
        throw unassignError;
      }

      totalUnassigned = unassignedDrivers?.length || 0;

      // status_history entries
      if (unassignedDrivers && unassignedDrivers.length > 0) {
        await supabase.from("status_history").insert(
          unassignedDrivers.map((driver: { id: string; name: string }) => ({
            entity_type: "driver",
            entity_id: driver.id,
            entity_name: driver.name,
            field_changed: "status",
            old_value: "various",
            new_value: "unassigned",
          })),
        );
      }
    }

    // For take-home working drivers we need to set status=assigned and vehicle=their default_vehicle.
    // Supabase update can't set vehicle per-row with different values in a single update,
    // so we do 2-step: set assigned for all, then set vehicle for each (still much smaller than your original loop).
    // If you want, we can replace this with an RPC later for a true single statement.

    if (takeHomeWorkingIds.length > 0) {
      const { data: assignedDrivers, error: assignedError } = await supabase
        .from("drivers")
        .update({ status: "assigned" })
        .in("id", takeHomeWorkingIds)
        .select("id, name, default_vehicle");

      if (assignedError) {
        console.error("Error setting take-home drivers to assigned:", assignedError);
        throw assignedError;
      }

      totalAssigned = assignedDrivers?.length || 0;

      // Set vehicle per driver to match their default_vehicle
      // (service role key, so this is safe server-side)
      for (const d of assignedDrivers || []) {
        const unit = takeHomeWorkingVehicleById.get(d.id);
      if (unit) {
        await supabase.from("drivers").update({ vehicle: unit }).eq
      }

      // status_history entries
      if (assignedDrivers && assignedDrivers.length > 0) {
        await supabase.from("status_history").insert(
          assignedDrivers.map((driver: { id: string; name: string }) => ({
            entity_type: "driver",
            entity_id: driver.id,
            entity_name: driver.name,
            field_changed: "status",
            old_value: "various",
            new_value: "assigned",
          })),
        );
      }
    }

    const totalStaleClosed = staleShifts?.length || 0;

    console.log(
      `Reset complete: ${totalUnassigned} → unassigned, ${totalAssigned} take-home working → assigned, ${totalStaleClosed} stale shifts auto-closed`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset complete: ${totalUnassigned} → unassigned, ${totalAssigned} take-home working → assigned, ${totalStaleClosed} stale shifts auto-closed`,
        totals: {
          unassigned: totalUnassigned,
          assigned_take_home_working: totalAssigned,
          stale_shifts_closed: totalStaleClosed,
          excluded_active_shift_drivers: activeShiftDriverIds.size,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in reset-driver-status:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
