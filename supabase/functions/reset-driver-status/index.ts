import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    console.log("Starting daily driver status reset...");

    // Get today's day of week (0 = Sunday, 6 = Saturday)
    const todayDayOfWeek = new Date().getDay();
    console.log(`Today is day of week: ${todayDayOfWeek}`);

    // Get all vehicles to identify take-home drivers
    const { data: vehicles } = await supabase.from("vehicles").select("unit, classification");

    const takeHomeVehicles = new Set(
      vehicles?.filter((v) => v.classification === "take_home").map((v) => v.unit) || [],
    );

    // Get driver schedules for today to check who is working
    const { data: todaySchedules } = await supabase
      .from("driver_schedules")
      .select("driver_id, is_off")
      .eq("day_of_week", todayDayOfWeek);

    // Build a map of driver_id -> is_off for today
    const driverScheduleMap = new Map<string, boolean>();
    todaySchedules?.forEach((s) => {
      driverScheduleMap.set(s.driver_id, s.is_off);
    });

    // Reset regular drivers (no default vehicle or not take-home) to 'unassigned'
    const { data: regularDrivers, error: regularError } = await supabase
      .from("drivers")
      .update({ status: "unassigned" })
      .neq("status", "off")
      .or("default_vehicle.is.null,default_vehicle.eq.")
      .select("id, name");

    if (regularError) {
      console.error("Error resetting regular driver statuses:", regularError);
      throw regularError;
    }

    // Get drivers with default vehicles
    const { data: driversWithVehicles } = await supabase
      .from("drivers")
      .select("id, name, default_vehicle")
      .neq("status", "off")
      .not("default_vehicle", "is", null)
      .neq("default_vehicle", "");

    // Separate take-home drivers from others, and check if they're scheduled to work today
    const takeHomeDriversWorking: typeof driversWithVehicles = [];
    const takeHomeDriversOff: typeof driversWithVehicles = [];
    const otherDriversWithVehicles: typeof driversWithVehicles = [];

    driversWithVehicles?.forEach((d) => {
      if (d.default_vehicle && takeHomeVehicles.has(d.default_vehicle)) {
        // This is a take-home driver - check if they're scheduled to work today
        const isOff = driverScheduleMap.get(d.id);
        if (isOff === true) {
          // Explicitly marked as off today
          takeHomeDriversOff.push(d);
          console.log(`Take-home driver ${d.name} is OFF today`);
        } else {
          // Working today (either has schedule with is_off=false, or no schedule entry means working)
          takeHomeDriversWorking.push(d);
          console.log(`Take-home driver ${d.name} is WORKING today`);
        }
      } else {
        otherDriversWithVehicles.push(d);
      }
    });

    // Reset non-take-home drivers with vehicles to unassigned
    if (otherDriversWithVehicles && otherDriversWithVehicles.length > 0) {
      const otherIds = otherDriversWithVehicles.map((d) => d.id);
      await supabase.from("drivers").update({ status: "unassigned" }).in("id", otherIds);
    }

    // Reset take-home drivers who are OFF today to unassigned
    if (takeHomeDriversOff && takeHomeDriversOff.length > 0) {
      const offIds = takeHomeDriversOff.map((d) => d.id);
      await supabase.from("drivers").update({ status: "unassigned", vehicle: null }).in("id", offIds);
    }

    // Set take-home drivers who are WORKING today to 'assigned' with their vehicle
    for (const driver of takeHomeDriversWorking || []) {
      await supabase
        .from("drivers")
        .update({ status: "assigned", vehicle: driver.default_vehicle })
        .eq("id", driver.id);
    }

    const totalReset =
      (regularDrivers?.length || 0) + (otherDriversWithVehicles?.length || 0) + (takeHomeDriversOff?.length || 0);
    const totalAssigned = takeHomeDriversWorking?.length || 0;
    console.log(`Reset ${totalReset} drivers to unassigned, ${totalAssigned} take-home drivers to assigned`);

    // Log the reset to status_history for auditing
    const allResetDrivers = [
      ...(regularDrivers || []),
      ...(otherDriversWithVehicles || []),
      ...(takeHomeDriversOff || []),
    ];
    if (allResetDrivers.length > 0) {
      const historyEntries = allResetDrivers.map((driver: { id: string; name: string }) => ({
        entity_type: "driver",
        entity_id: driver.id,
        entity_name: driver.name,
        field_changed: "status",
        old_value: "various",
        new_value: "unassigned",
      }));

      const { error: historyError } = await supabase.from("status_history").insert(historyEntries);

      if (historyError) {
        console.error("Error logging status history:", historyError);
      }
    }

    // Log take-home drivers being set to assigned
    if (takeHomeDriversWorking && takeHomeDriversWorking.length > 0) {
      const takeHomeHistoryEntries = takeHomeDriversWorking.map((driver: { id: string; name: string }) => ({
        entity_type: "driver",
        entity_id: driver.id,
        entity_name: driver.name,
        field_changed: "status",
        old_value: "various",
        new_value: "assigned",
      }));

      await supabase.from("status_history").insert(takeHomeHistoryEntries);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset ${totalReset} drivers to unassigned, ${totalAssigned} take-home drivers to assigned`,
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
