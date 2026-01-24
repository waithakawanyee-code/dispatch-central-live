import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to parse time string (HH:MM) to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Helper to add minutes to a time string, returning new HH:MM
function addMinutesToTime(time: string, minutesToAdd: number): string {
  let totalMinutes = timeToMinutes(time) + minutesToAdd;
  
  // Handle wrap around midnight
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Build an ISO timestamp for a given date and time
function buildTimestamp(dateStr: string, timeStr: string): string {
  // Create date in NY timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  // Create the date directly
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.toISOString();
}

// Check if punch out wraps to next day
function punchOutWrapsToNextDay(shiftEnd: string): boolean {
  // Shift 3 ends at 03:00 - punch out at 03:30 is same day conceptually
  // But if shift ends between 00:00 and 06:00, it's a wrap from previous day
  const endMinutes = timeToMinutes(shiftEnd);
  return endMinutes < 6 * 60; // Before 6 AM means it wrapped from previous day
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in NY timezone
    const { data: nyDateData } = await supabase.rpc("current_ny_date");
    const todayStr = nyDateData || new Date().toISOString().split("T")[0];
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const todayDate = new Date(todayStr + "T12:00:00Z");
    const dayOfWeek = todayDate.getUTCDay();

    console.log(`Processing shuttle punch automation for ${todayStr} (day ${dayOfWeek})`);

    // Fetch all Primary Amtrak shuttle schedules for today
    const { data: amtrakSchedules, error: amtrakError } = await supabase
      .from("shuttle_schedules")
      .select(`
        id,
        driver_id,
        program,
        day_of_week,
        shift_number,
        start_time,
        end_time
      `)
      .eq("program", "amtrak")
      .eq("day_of_week", dayOfWeek);

    if (amtrakError) {
      console.error("Error fetching Amtrak schedules:", amtrakError);
      throw amtrakError;
    }

    // Get primary Amtrak drivers
    const { data: primaryAmtrakDrivers, error: driversError } = await supabase
      .from("drivers")
      .select("id, name, amtrak_primary")
      .eq("amtrak_primary", true)
      .eq("is_active", true);

    if (driversError) {
      console.error("Error fetching drivers:", driversError);
      throw driversError;
    }

    const primaryDriverIds = new Set((primaryAmtrakDrivers || []).map(d => d.id));
    const driverNameMap = new Map((primaryAmtrakDrivers || []).map(d => [d.id, d.name]));

    // Filter schedules to only primary drivers
    const primarySchedules = (amtrakSchedules || []).filter(s => 
      primaryDriverIds.has(s.driver_id)
    );

    console.log(`Found ${primarySchedules.length} Primary Amtrak shifts for today`);

    // Check existing shifts for today to avoid duplicates
    const { data: existingShifts, error: existingError } = await supabase
      .from("shifts")
      .select("driver_id, notes")
      .eq("workday_date", todayStr);

    if (existingError) {
      console.error("Error fetching existing shifts:", existingError);
      throw existingError;
    }

    // Track driver IDs who already have shuttle auto-punch shifts
    const driversWithAutoShifts = new Set<string>();
    (existingShifts || []).forEach(shift => {
      if (shift.notes?.includes("[AUTO-SHUTTLE]")) {
        driversWithAutoShifts.add(shift.driver_id);
      }
    });

    let shiftsCreated = 0;
    const errors: string[] = [];

    for (const schedule of primarySchedules) {
      // Skip if driver already has an auto-generated shift today
      if (driversWithAutoShifts.has(schedule.driver_id)) {
        console.log(`Skipping ${driverNameMap.get(schedule.driver_id)} - already has auto-punch shift`);
        continue;
      }

      if (!schedule.start_time || !schedule.end_time) {
        console.log(`Skipping schedule ${schedule.id} - missing start/end time`);
        continue;
      }

      const driverName = driverNameMap.get(schedule.driver_id) || "Unknown";

      // Calculate punch times: IN = 30 mins before start, OUT = 30 mins after end
      const punchInTime = addMinutesToTime(schedule.start_time, -30);
      const punchOutTime = addMinutesToTime(schedule.end_time, 30);

      // Build timestamps
      let punchInAt = buildTimestamp(todayStr, punchInTime);
      
      // For punch out, check if end time wraps to next day
      let punchOutDate = todayStr;
      if (punchOutWrapsToNextDay(schedule.end_time)) {
        // End time is early morning (e.g., 03:00), so punch out is next day
        const nextDay = new Date(todayDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        punchOutDate = nextDay.toISOString().split("T")[0];
      }
      let punchOutAt = buildTimestamp(punchOutDate, punchOutTime);

      console.log(`Creating shift for ${driverName}: IN ${punchInTime} (${punchInAt}), OUT ${punchOutTime} (${punchOutAt})`);

      // Create the shift record
      const { error: insertError } = await supabase.from("shifts").insert({
        driver_id: schedule.driver_id,
        driver_name: driverName,
        punch_in_at: punchInAt,
        punch_out_at: punchOutAt,
        workday_date: todayStr,
        vehicle_unit: null, // Shuttle drivers don't use fleet vehicles
        notes: `[AUTO-SHUTTLE] Amtrak Shift ${schedule.shift_number} - Auto-generated punch times`,
        exception_flags: {
          auto_generated: true,
          shuttle_program: "amtrak",
          shift_number: schedule.shift_number,
          original_start: schedule.start_time,
          original_end: schedule.end_time,
        },
      });

      if (insertError) {
        console.error(`Error creating shift for ${driverName}:`, insertError);
        errors.push(`${driverName}: ${insertError.message}`);
      } else {
        shiftsCreated++;
        driversWithAutoShifts.add(schedule.driver_id);

        // Log to status_history
        await supabase.from("status_history").insert({
          entity_type: "driver",
          entity_id: schedule.driver_id,
          entity_name: driverName,
          field_changed: "shuttle_auto_punch",
          old_value: null,
          new_value: `Amtrak Shift ${schedule.shift_number}: ${schedule.start_time}-${schedule.end_time}`,
        });
      }
    }

    console.log(`Shuttle punch automation complete: ${shiftsCreated} shifts created`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Shuttle punch automation complete`,
        date: todayStr,
        dayOfWeek,
        shiftsCreated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in shuttle-punch-automation:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
