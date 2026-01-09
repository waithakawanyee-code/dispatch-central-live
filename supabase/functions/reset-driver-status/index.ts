mport { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// PHASE 2: Reset driver statuses (single atomic SQL)
// ============================================

const todayDayOfWeek = new Date().getDay();

const { data: resetResult, error: resetError } = await supabase
  .from("drivers")
  .select("*")
  .limit(1); // dummy call to ensure client is alive

if (resetError) throw resetError;

// Execute raw SQL via Postgres function call pattern
const { error: sqlError } = await supabase.rpc("execute_sql", {
  sql: `
    with
    active_shift_drivers as (
      select distinct driver_id
      from shifts
      where punch_out_at is null
        and driver_id is not null
    ),
    working_today as (
      select driver_id
      from driver_schedules
      where day_of_week = ${todayDayOfWeek}
        and coalesce(is_off, false) = false
    ),
    take_home_units as (
      select unit
      from vehicles
      where classification = 'take_home'
        and unit is not null
        and unit <> ''
    ),
    eligible as (
      select d.id, d.default_vehicle
      from drivers d
      where d.status <> 'off'
        and d.id not in (select driver_id from active_shift_drivers)
    ),
    classified as (
      select
        e.id,
        case
          when e.default_vehicle is not null
           and e.default_vehicle <> ''
           and e.default_vehicle in (select unit from take_home_units)
           and e.id in (select driver_id from working_today)
          then true
          else false
        end as should_assign
      from eligible e
    )
    update drivers d
    set
      status = case when c.should_assign then 'assigned' else 'unassigned' end,
      vehicle = case when c.should_assign then d.default_vehicle else null end
    from classified c
    where d.id = c.id;
  `,
});

if (sqlError) {
  console.error("Daily reset SQL failed:", sqlError);
  throw sqlError;
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