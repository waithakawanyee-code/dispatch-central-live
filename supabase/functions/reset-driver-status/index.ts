import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: require CRON_SECRET header
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    // PHASE 2: Reset driver statuses
    // ============================================

    const todayDayOfWeek = new Date().getDay();
    console.log(`Today is day of week: ${todayDayOfWeek}`);

    // 1) Pull take-home vehicle OWNERS (source of truth)
    const { data: takeHomeVehicles, error: takeHomeVehiclesError } = await supabase
      .from("vehicles")
      .select("unit, assigned_driver_id")
      .eq("classification", "take_home");

    if (takeHomeVehiclesError) {
      console.error("Error fetching take-home vehicles:", takeHomeVehiclesError);
      throw takeHomeVehiclesError;
    }

    // Map: driver_id -> take-home unit
    const takeHomeOwnerToUnit = new Map<string, string>();
    (takeHomeVehicles || []).forEach((v) => {
      if (v.assigned_driver_id && v.unit) {
        takeHomeOwnerToUnit.set(v.assigned_driver_id, v.unit);
      }
    });

    console.log("Take-home owners found:", takeHomeOwnerToUnit.size);

    // 2) Pull today's schedules
    const { data: todaySchedules, error: schedulesError } = await supabase
      .from("driver_schedules")
      .select("driver_id, is_off")
      .eq("day_of_week", todayDayOfWeek);

    if (schedulesError) {
      console.error("Error fetching today schedules:", schedulesError);
      throw schedulesError;
    }

    // driver_id -> workingToday boolean
    // We store true when scheduled & not off; false when explicitly off.
    // Later we treat missing schedule row as WORKING by using !== false.
    const workingTodayMap = new Map<string, boolean>();
    (todaySchedules || []).forEach((s) => {
      workingTodayMap.set(s.driver_id, s.is_off === true ? false : true);
    });

    // 3) Get all drivers that are not status=off (and we will exclude active-shift drivers)
    // Get all active drivers not already in "unconfirmed" status
    const { data: allDrivers, error: allDriversError } = await supabase
      .from("drivers")
      .select("id, name, status, default_vehicle, vehicle")
      .eq("is_active", true)
      .neq("status", "done");

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
      const takeHomeUnit = takeHomeOwnerToUnit.get(d.id); // vehicles.assigned_driver_id -> unit
      const isTakeHomeOwner = !!takeHomeUnit;

      // missing schedule row => working; only explicit false means off
      const workingToday = workingTodayMap.get(d.id) !== false;

      if (isTakeHomeOwner && workingToday) {
        takeHomeWorkingIds.push(d.id);
        takeHomeWorkingVehicleById.set(d.id, takeHomeUnit!);
      } else {
        toUnassignIds.push(d.id);
      }
    }

    console.log("Take-home working (scheduled today):", takeHomeWorkingIds.length);
    console.log("Drivers to unassign:", toUnassignIds.length);

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

      // status_history entries (unassigned)
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

    // Set take-home working drivers to assigned (bulk)
    let assignedDrivers: { id: string; name: string }[] = [];

    if (takeHomeWorkingIds.length > 0) {
      const { data, error: assignedError } = await supabase
        .from("drivers")
        .update({ status: "assigned" })
        .in("id", takeHomeWorkingIds)
        .select("id, name");

      if (assignedError) {
        console.error("Error setting take-home drivers to assigned:", assignedError);
        throw assignedError;
      }

      assignedDrivers = data || [];
      totalAssigned = assignedDrivers.length;

      // Set vehicle per driver from the takeHomeWorkingVehicleById map
      for (const d of assignedDrivers) {
        const unit = takeHomeWorkingVehicleById.get(d.id);
        if (!unit) continue;

        const { error: vehErr } = await supabase.from("drivers").update({ vehicle: unit }).eq("id", d.id);

        if (vehErr) {
          console.error(`Error setting vehicle for driver ${d.id} -> ${unit}:`, vehErr);
        }
      }

      // status_history entries (assigned)
      if (assignedDrivers.length > 0) {
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
