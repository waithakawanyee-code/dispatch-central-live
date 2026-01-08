import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  try {
    // Secret protection
    const expectedSecret = Deno.env.get("WASH_EVENTS_SECRET");
    const providedSecret = req.headers.get("x-lovable-secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Supabase service client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[clean-status-automation] Starting 24hr timeout check...");

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

    const updatedVehicles: string[] = [];
    const skippedVehicles: string[] = [];

    const today = new Date().toISOString().split("T")[0];

    for (const vehicle of vehicles || []) {
      if (vehicle.clean_status === "dirty" && vehicle.dirty_reason === "TIMEOUT_24H") {
        skippedVehicles.push(vehicle.unit);
        continue;
      }

      const now = new Date().toISOString();
      const idempotencyKey = `timeout_24h_${vehicle.id}_${today}`;

      const { data: existingEvent } = await supabase
        .from("vehicle_status_events")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingEvent) {
        skippedVehicles.push(vehicle.unit);
        continue;
      }

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
