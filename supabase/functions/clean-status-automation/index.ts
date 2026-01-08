import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("WASH_EVENTS_SECRET");
    const providedSecret = req.headers.get("x-lovable-secret");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (expectedSecret && providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("[clean-status-automation] Starting 24hr timeout check...");

    // Get vehicles that need to be marked dirty due to 24hr timeout
    // Conditions:
    // - primary_category = 'above_all' (no automation for specialty)
    // - always_clean_exempt = false
    // - last_wash_at is not null
    // - now > last_wash_at + 24 hours
    // - NOT already dirty with reason TIMEOUT_24H
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: vehicles, error: fetchError } = await supabase
      .from("vehicles")
      .select("id, unit, clean_status, dirty_reason, last_wash_at")
      .eq("primary_category", "above_all")
      .eq("always_clean_exempt", false)
      .not("last_wash_at", "is", null)
      .lt("last_wash_at", twentyFourHoursAgo);

    if (fetchError) {
      console.error("[clean-status-automation] Error fetching vehicles:", fetchError);
      throw fetchError;
    }

    console.log(`[clean-status-automation] Found ${vehicles?.length || 0} vehicles past 24hr threshold`);

    const updatedVehicles: string[] = [];
    const skippedVehicles: string[] = [];

    for (const vehicle of vehicles || []) {
      // Skip if already dirty with TIMEOUT_24H reason
      if (vehicle.clean_status === "dirty" && vehicle.dirty_reason === "TIMEOUT_24H") {
        console.log(`[clean-status-automation] Skipping ${vehicle.unit} - already dirty with TIMEOUT_24H`);
        skippedVehicles.push(vehicle.unit);
        continue;
      }

      const now = new Date().toISOString();
      const idempotencyKey = `timeout_24h_${vehicle.id}_${new Date().toISOString().split("T")[0]}`;

      // Check if we already processed this today (idempotency)
      const { data: existingEvent } = await supabase
        .from("vehicle_status_events")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingEvent) {
        console.log(`[clean-status-automation] Skipping ${vehicle.unit} - already processed today`);
        skippedVehicles.push(vehicle.unit);
        continue;
      }

      // Update the vehicle
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          clean_status: "dirty",
          dirty_reason: "TIMEOUT_24H",
          last_marked_dirty_at: now,
          clean_status_updated_at: now,
          clean_status_source: "automation",
        })
        .eq("id", vehicle.id);

      if (updateError) {
        console.error(`[clean-status-automation] Error updating ${vehicle.unit}:`, updateError);
        continue;
      }

      // Log the event
      const { error: eventError } = await supabase.from("vehicle_status_events").insert({
        vehicle_id: vehicle.id,
        event_type: "CLEAN_STATUS_TIMEOUT_24H",
        occurred_at: now,
        source: "automation",
        payload_json: {
          previous_status: vehicle.clean_status,
          new_status: "dirty",
          reason: "TIMEOUT_24H",
          last_wash_at: vehicle.last_wash_at,
        },
        idempotency_key: idempotencyKey,
      });

      if (eventError) {
        console.error(`[clean-status-automation] Error logging event for ${vehicle.unit}:`, eventError);
      }

      console.log(`[clean-status-automation] Marked ${vehicle.unit} as dirty (TIMEOUT_24H)`);
      updatedVehicles.push(vehicle.unit);
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      updated: updatedVehicles,
      skipped: skippedVehicles,
      message: `Updated ${updatedVehicles.length} vehicles, skipped ${skippedVehicles.length}`,
    };

    console.log("[clean-status-automation] Completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[clean-status-automation] Error:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
