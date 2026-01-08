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
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  // DEBUG: log headers + raw body (temporary)
  const rawText = await req.text();

  console.log("[wash-events] headers:", Object.fromEntries(req.headers.entries()));
  console.log("[wash-events] raw body:", rawText);

  // Parse JSON once
  let parsedBody: any = {};
  try {
    parsedBody = rawText ? JSON.parse(rawText) : {};
  } catch (e) {
    console.log("[wash-events] JSON parse failed:", String(e));
    parsedBody = {};
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support BOTH formats:
    // 1) Direct call: { vehicle_identifier, washed_at?, raw_source?, set_clean? }
    // 2) Samsara webhook: { eventType, data: { ... } }  (we will map later once we see payload)
    const vehicle_identifier: string | undefined =
      parsedBody?.vehicle_identifier ??
      parsedBody?.data?.vehicle?.name ??
      parsedBody?.data?.asset?.name ??
      parsedBody?.data?.vehicleName;

    const washed_at: string | undefined =
      parsedBody?.washed_at ?? parsedBody?.data?.eventTime ?? parsedBody?.data?.occurredAt ?? parsedBody?.eventTime;

    const raw_source: string | undefined = parsedBody?.raw_source ?? "samsara_webhook";

    const set_clean: boolean = typeof parsedBody?.set_clean === "boolean" ? parsedBody.set_clean : true;

    if (!vehicle_identifier) {
      return new Response(JSON.stringify({ error: "vehicle_identifier is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[wash-events] Processing wash event for: ${vehicle_identifier}`);

    // Match vehicle by unit (case-insensitive)
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
      return new Response(JSON.stringify({ success: false, error: "Vehicle not found", vehicle_identifier }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const vehicle = vehicles[0];
    const washedAtTime = washed_at ? new Date(washed_at).toISOString() : new Date().toISOString();
    const now = new Date().toISOString();

    // Idempotency key (vehicle + date + source)
    const washDate = washedAtTime.split("T")[0];
    const sourceHash = raw_source ? raw_source.substring(0, 20) : "unknown";
    const idempotencyKey = `wash_${vehicle.id}_${washDate}_${sourceHash}`;

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Update clean status only for Above All non-exempt vehicles
    const isAboveAll = vehicle.primary_category === "above_all";
    const isNotExempt = !vehicle.always_clean_exempt;
    const shouldUpdateStatus = isAboveAll && isNotExempt && set_clean;

    console.log(
      `[wash-events] Vehicle ${vehicle.unit}: above_all=${isAboveAll}, not_exempt=${isNotExempt}, set_clean=${set_clean}`,
    );

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

    // Log wash event (always)
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
        received_payload: parsedBody, // helpful for debugging; remove later if you want
      },
      idempotency_key: idempotencyKey,
    });

    if (eventError) {
      console.error(`[wash-events] Error logging event for ${vehicle.unit}:`, eventError);
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
