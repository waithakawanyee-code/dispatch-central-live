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

    // Fetch all shuttle schedules for today (Amtrak and BPH)
    const { data: shuttleSchedules, error: schedulesError } = await supabase
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
      .eq("day_of_week", dayOfWeek)
      .in("program", ["amtrak", "bph"]);

    if (schedulesError) {
      console.error("Error fetching shuttle schedules:", schedulesError);
      throw schedulesError;
    }

    // Get primary Amtrak and BPH drivers
    const { data: primaryDrivers, error: driversError } = await supabase
      .from("drivers")
      .select("id, name, amtrak_primary, bph_primary")
      .eq("is_active", true)
      .or("amtrak_primary.eq.true,bph_primary.eq.true");

    if (driversError) {
      console.error("Error fetching drivers:", driversError);
      throw driversError;
    }

    const primaryAmtrakIds = new Set((primaryDrivers || []).filter(d => d.amtrak_primary).map(d => d.id));
    const primaryBphIds = new Set((primaryDrivers || []).filter(d => d.bph_primary).map(d => d.id));
    const driverNameMap = new Map((primaryDrivers || []).map(d => [d.id, d.name]));

    // Filter schedules to only primary drivers for their respective programs
    const primarySchedules = (shuttleSchedules || []).filter(s => {
      if (s.program === "amtrak") return primaryAmtrakIds.has(s.driver_id);
      if (s.program === "bph") return primaryBphIds.has(s.driver_id);
      return false;
    });

    console.log(`Found ${primarySchedules.length} Primary Shuttle shifts for today`);

    // Check existing shifts for today to avoid duplicates
    const { data: existingShifts, error: existingError } = await supabase
      .from("shifts")
      .select("driver_id, notes")
      .eq("workday_date", todayStr);

    if (existingError) {
      console.error("Error fetching existing shifts:", existingError);
      throw existingError;
    }

    // Track driver IDs who already have shuttle auto-punch shifts (by program)
    const driversWithAutoShifts = new Map<string, Set<string>>();
    (existingShifts || []).forEach(shift => {
      if (shift.notes?.includes("[AUTO-SHUTTLE]")) {
        const program = shift.notes.includes("Amtrak") ? "amtrak" : 
                        shift.notes.includes("BPH") ? "bph" : null;
        if (program) {
          if (!driversWithAutoShifts.has(shift.driver_id)) {
            driversWithAutoShifts.set(shift.driver_id, new Set());
          }
          driversWithAutoShifts.get(shift.driver_id)!.add(program);
        }
      }
    });

    let shiftsCreated = 0;
    const errors: string[] = [];

    for (const schedule of primarySchedules) {
      // Skip if driver already has an auto-generated shift today for this program
      const driverShifts = driversWithAutoShifts.get(schedule.driver_id);
      if (driverShifts?.has(schedule.program)) {
        console.log(`Skipping ${driverNameMap.get(schedule.driver_id)} - already has ${schedule.program} auto-punch shift`);
        continue;
      }

      if (!schedule.start_time || !schedule.end_time) {
        console.log(`Skipping schedule ${schedule.id} - missing start/end time`);
        continue;
      }

      const driverName = driverNameMap.get(schedule.driver_id) || "Unknown";

      let punchInTime: string;
      let punchOutTime: string;
      let shiftDescription: string;

      if (schedule.program === "bph") {
        // BPH: Fixed punch times - 06:00 to 18:00 (12 hours)
        // BPH runs 07:00-18:00 but driver is on clock 06:00-18:00
        punchInTime = "06:00";
        punchOutTime = "18:00";
        shiftDescription = `BPH Shift - Fixed 12hr (06:00-18:00)`;
      } else {
        // Amtrak: IN = 30 mins before start, OUT = 30 mins after end
        punchInTime = addMinutesToTime(schedule.start_time, -30);
        punchOutTime = addMinutesToTime(schedule.end_time, 30);
        shiftDescription = `Amtrak Shift ${schedule.shift_number} - Auto-generated punch times`;
      }

      // Build timestamps
      let punchInAt = buildTimestamp(todayStr, punchInTime);
      
      // For punch out, check if end time wraps to next day
      let punchOutDate = todayStr;
      if (punchOutWrapsToNextDay(schedule.end_time) && schedule.program === "amtrak") {
        // Only Amtrak has overnight shifts; BPH is always same-day
        const nextDay = new Date(todayDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        punchOutDate = nextDay.toISOString().split("T")[0];
      }
      let punchOutAt = buildTimestamp(punchOutDate, punchOutTime);

      console.log(`Creating shift for ${driverName} (${schedule.program}): IN ${punchInTime} (${punchInAt}), OUT ${punchOutTime} (${punchOutAt})`);

      // Create the shift record
      const { error: insertError } = await supabase.from("shifts").insert({
        driver_id: schedule.driver_id,
        driver_name: driverName,
        punch_in_at: punchInAt,
        punch_out_at: punchOutAt,
        workday_date: todayStr,
        vehicle_unit: null, // Shuttle drivers don't use fleet vehicles
        notes: `[AUTO-SHUTTLE] ${shiftDescription}`,
        exception_flags: {
          auto_generated: true,
          shuttle_program: schedule.program,
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
        if (!driversWithAutoShifts.has(schedule.driver_id)) {
          driversWithAutoShifts.set(schedule.driver_id, new Set());
        }
        driversWithAutoShifts.get(schedule.driver_id)!.add(schedule.program);

        // Log to status_history
        await supabase.from("status_history").insert({
          entity_type: "driver",
          entity_id: schedule.driver_id,
          entity_name: driverName,
          field_changed: "shuttle_auto_punch",
          old_value: null,
          new_value: `${schedule.program.toUpperCase()} Shift: ${punchInTime}-${punchOutTime}`,
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
