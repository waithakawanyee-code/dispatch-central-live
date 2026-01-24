import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WashEventRequest {
  vehicle_identifier: string;
  washed_at?: string;
  raw_source?: string;
  set_clean?: boolean;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  // ---- DEBUG: log headers + raw body (temporary) ----
  const rawText = await req.text();

  console.log("[wash-events] headers:", Object.fromEntries(req.headers.entries()));
  console.log("[wash-events] raw body:", rawText);

  // Parse JSON once
  let parsedBody: any = {};
  try {
    parsedBody = rawText ? JSON.parse(rawText) : {};
  } catch (e) {
    console.log("[wash-events] JSON parse failed:", String(e));

    // IMPORTANT: return 400 instead of 500 so we can see what's coming in
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid JSON body",
        raw_body: rawText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
  // --------------------------------------------------

  try {
    // Supabase service client (needed for auth validation and operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: require EITHER a valid shared secret OR an authorized user (ADMIN/DISPATCHER)
    const expectedSecret = Deno.env.get("WASH_EVENTS_SECRET");
    const providedSecret = req.headers.get("x-lovable-secret");
    const authHeader = req.headers.get("authorization");

    const hasValidSecret = expectedSecret && providedSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith("Bearer ");

    if (!hasValidSecret && !hasAuthHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - no credentials provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // If using JWT auth (not shared secret), verify the user has ADMIN or DISPATCHER role
    if (!hasValidSecret && hasAuthHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      
      // Create a client with the user's token to validate it
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await userClient.auth.getUser(jwt);

      if (claimsError || !claimsData?.user) {
        console.log("[wash-events] Invalid JWT token:", claimsError?.message);
        return new Response(JSON.stringify({ success: false, error: "Invalid authentication token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      const userId = claimsData.user.id;

      // Check if user has ADMIN or DISPATCHER role using the service client
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.log("[wash-events] Could not find user profile:", profileError?.message);
        return new Response(JSON.stringify({ success: false, error: "User profile not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      if (!profile.active) {
        console.log("[wash-events] User account is inactive");
        return new Response(JSON.stringify({ success: false, error: "User account is inactive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const allowedRoles = ["ADMIN", "DISPATCHER"];
      if (!allowedRoles.includes(profile.role)) {
        console.log(`[wash-events] User role '${profile.role}' is not authorized. Required: ${allowedRoles.join(" or ")}`);
        return new Response(JSON.stringify({ success: false, error: "Insufficient permissions - requires ADMIN or DISPATCHER role" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      console.log(`[wash-events] Authorized user: ${userId} with role: ${profile.role}`);
    } else if (hasValidSecret) {
      console.log("[wash-events] Authorized via shared secret");
    }

    /**
     * Filter: Only process events from "Sonny's Car wash" geofence
     * Samsara sends the geofence name in data.address.name
     */
    const geofenceName: string | undefined = parsedBody?.data?.address?.name;
    const ALLOWED_GEOFENCE = "Sonny's Car wash";

    if (geofenceName && geofenceName.toLowerCase() !== ALLOWED_GEOFENCE.toLowerCase()) {
      console.log(`[wash-events] Ignoring geofence: "${geofenceName}" (only processing "${ALLOWED_GEOFENCE}")`);
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          message: `Geofence "${geofenceName}" is not a car wash location`,
          allowed_geofence: ALLOWED_GEOFENCE,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    /**
     * We support BOTH:
     * A) Direct calls: { vehicle_identifier, washed_at?, raw_source?, set_clean? }
     * B) Webhook-ish payloads (Samsara GeofenceEntry events)
     */
    const vehicle_identifier: string | undefined =
      parsedBody?.vehicle_identifier ??
      parsedBody?.data?.vehicle?.name ??
      parsedBody?.data?.vehicle?.unit ??
      parsedBody?.data?.asset?.name ??
      parsedBody?.data?.asset?.externalId ??
      parsedBody?.vehicle?.name ??
      parsedBody?.vehicleName;

    const washed_at: string | undefined =
      parsedBody?.washed_at ?? parsedBody?.data?.eventTime ?? parsedBody?.data?.occurredAt ?? parsedBody?.eventTime;

    const raw_source: string = parsedBody?.raw_source ?? parsedBody?.data?.source ?? "webhook";

    const set_clean: boolean = typeof parsedBody?.set_clean === "boolean" ? parsedBody.set_clean : true;

    if (!vehicle_identifier) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "vehicle_identifier is required",
          hint: "Send { vehicle_identifier: 'Car-12' }",
          received_keys: Object.keys(parsedBody || {}),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    console.log(`[wash-events] Processing wash event for: ${vehicle_identifier} at geofence: ${geofenceName || "direct call"}`);

    console.log(`[wash-events] Processing wash event for: ${vehicle_identifier}`);

    // Match vehicle by unit - use EXACT matching (case-insensitive) to prevent cross-vehicle updates
    const identifier = vehicle_identifier.trim();

    // First, try exact match (case-insensitive)
    const { data: exactMatches, error: exactSearchError } = await supabase
      .from("vehicles")
      .select("id, unit, primary_category, always_clean_exempt, clean_status")
      .ilike("unit", identifier);

    if (exactSearchError) {
      console.error("[wash-events] Error searching vehicles:", exactSearchError);
      throw exactSearchError;
    }

    let vehicle = exactMatches?.[0];

    // If no exact match found, try normalized matching (strip common prefixes like "Car-", "V-", etc.)
    if (!vehicle) {
      // Normalize identifier - remove common prefixes and try again
      const normalizedIdentifier = identifier.replace(/^(car-?|v-?|vehicle-?)/i, "").trim();
      
      const { data: normalizedMatches, error: normalizedSearchError } = await supabase
        .from("vehicles")
        .select("id, unit, primary_category, always_clean_exempt, clean_status")
        .or(`unit.ilike.${identifier},unit.ilike.Car-${normalizedIdentifier},unit.ilike.V-${normalizedIdentifier}`);

      if (normalizedSearchError) {
        console.error("[wash-events] Error searching vehicles with normalized identifier:", normalizedSearchError);
        throw normalizedSearchError;
      }

      // If multiple matches found, reject with ambiguity error
      if (normalizedMatches && normalizedMatches.length > 1) {
        console.log(`[wash-events] Ambiguous vehicle identifier: ${vehicle_identifier} matches ${normalizedMatches.length} vehicles`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Ambiguous vehicle identifier - multiple matches found",
            vehicle_identifier,
            matches: normalizedMatches.map((v) => v.unit),
            hint: "Please provide the exact vehicle unit name",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }

      vehicle = normalizedMatches?.[0];
    }

    if (!vehicle) {
      console.log(`[wash-events] Vehicle not found: ${vehicle_identifier}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Vehicle not found",
          vehicle_identifier,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    console.log(`[wash-events] Matched vehicle: ${vehicle.unit} (exact match for "${identifier}")`);
    
    // Double-check we have a single, unambiguous match
    if (exactMatches && exactMatches.length > 1) {
      console.log(`[wash-events] Warning: Multiple exact matches for ${identifier}, using first: ${vehicle.unit}`);
    }

    const washedAtTime = washed_at ? new Date(washed_at).toISOString() : new Date().toISOString();
    const now = new Date().toISOString();

    // Idempotency key (vehicle + date + source)
    const washDate = washedAtTime.split("T")[0];
    const sourceHash = (raw_source || "unknown").substring(0, 20);
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

    // Only update clean status for Above All vehicles that are not exempt
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

    // Log wash event (always)
    const { error: eventError } = await supabase.from("vehicle_status_events").insert({
      vehicle_id: vehicle.id,
      event_type: "WASH_RECORDED",
      occurred_at: washedAtTime,
      source: "integration",
      payload_json: {
        raw_source,
        previous_status: vehicle.clean_status,
        new_status: shouldUpdateStatus ? "clean" : vehicle.clean_status,
        status_updated: shouldUpdateStatus,
        washed_at: washedAtTime,
        received_payload: parsedBody, // keep for now so we can map Samsara fields, remove later if you want
      },
      idempotency_key: idempotencyKey,
    });

    if (eventError) {
      console.error(`[wash-events] Error logging event for ${vehicle.unit}:`, eventError);
      // Don't throw — event logging failure shouldn't fail the whole request
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
