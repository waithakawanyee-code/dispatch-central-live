import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WashEventRequest {
  vehicle_identifier: string;
  washed_at?: string;
  raw_source?: string;
  set_clean?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const parsed: WashEventRequest = body as WashEventRequest;
    const { vehicle_identifier, washed_at, raw_source, set_clean = true } = parsed;
    const { vehicle_identifier, washed_at, raw_source, set_clean = true } = body;

    if (!vehicle_identifier) {
      return new Response(JSON.stringify({ error: "vehicle_identifier is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[wash-events] Processing wash event for: ${vehicle_identifier}`);

    // Match vehicle by unit (case-insensitive) - could also match by plate if field exists
    const identifier = vehicle_identifier.trim();
    const { data: vehicles, error: searchError } = await supabase
      .from("vehicles")
      .select("id, unit, primary_category, always_clean_exempt, clean_status")
      .or(`unit.ilike.${identifier}`);

    if (searchError) {
      console.error("[wash-events] Error searching vehicles:", searchError);
      throw searchError;
    }

    if (!vehicles || vehicles.length === 0) {
      console.log(`[wash-events] Vehicle not found: ${vehicle_identifier}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Vehicle not found",
          vehicle_identifier,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const vehicle = vehicles[0];
    const washedAtTime = washed_at ? new Date(washed_at).toISOString() : new Date().toISOString();
    const now = new Date().toISOString();

    // Generate idempotency key based on vehicle, date, and source
    const washDate = washedAtTime.split("T")[0];
    const sourceHash = raw_source ? raw_source.substring(0, 20) : "unknown";
    const idempotencyKey = `wash_${vehicle.id}_${washDate}_${sourceHash}`;

    // Check for duplicate
    const { data: existingEvent } = await supabase
      .from("vehicle_status_events")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingEvent) {
      console.log(`[wash-events] Duplicate wash event detected: ${idempotencyKey}`);
      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          message: "Wash event already recorded",
          vehicle_unit: vehicle.unit,
          idempotency_key: idempotencyKey,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Determine if we should update clean status
    const isAboveAll = vehicle.primary_category === "above_all";
    const isNotExempt = !vehicle.always_clean_exempt;
    const shouldUpdateStatus = isAboveAll && isNotExempt && set_clean;

    console.log(
      `[wash-events] Vehicle ${vehicle.unit}: above_all=${isAboveAll}, not_exempt=${isNotExempt}, set_clean=${set_clean}`,
    );

    // Update vehicle
    const updateData: Record<string, unknown> = {
      last_wash_at: washedAtTime,
      updated_at: now,
    };

    if (shouldUpdateStatus) {
      updateData.clean_status = "clean";
      updateData.clean_status_updated_at = now;
      updateData.clean_status_source = "integration";
      updateData.dirty_reason = null;
    }

    const { error: updateError } = await supabase.from("vehicles").update(updateData).eq("id", vehicle.id);

    if (updateError) {
      console.error(`[wash-events] Error updating vehicle ${vehicle.unit}:`, updateError);
      throw updateError;
    }

    // Always log the wash event
    const { error: eventError } = await supabase.from("vehicle_status_events").insert({
      vehicle_id: vehicle.id,
      event_type: "WASH_RECORDED",
      occurred_at: washedAtTime,
      source: "integration",
      payload_json: {
        raw_source: raw_source || null,
        previous_status: vehicle.clean_status,
        new_status: shouldUpdateStatus ? "clean" : vehicle.clean_status,
        status_updated: shouldUpdateStatus,
        washed_at: washedAtTime,
      },
      idempotency_key: idempotencyKey,
    });

    if (eventError) {
      console.error(`[wash-events] Error logging event for ${vehicle.unit}:`, eventError);
      // Don't throw - event logging failure shouldn't fail the whole request
    }

    const result = {
      success: true,
      vehicle_unit: vehicle.unit,
      vehicle_id: vehicle.id,
      washed_at: washedAtTime,
      clean_status_updated: shouldUpdateStatus,
      idempotency_key: idempotencyKey,
    };

    console.log("[wash-events] Completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[wash-events] Error:", error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
