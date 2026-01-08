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

  // Only allow POST (keeps behavior consistent + safer)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // --- Secret protection (Lovable Cloud best practice) ---
    const expectedSecret = Deno.env.get("WASH_EVENTS_SECRET");
    const providedSecret = req.headers.get("x-lovable-secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // --- Supabase service client (bypasses RLS safely inside Edge Function) ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[clean-status-automation] Starting 24hr timeout check...");

    // 24 hours ago timestamp
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find vehicles:
    // - Above All only
    // - Not exempt
    // - last_wash_at exists
    // - last_wash_at older than 24 hours
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

    console.log(
      `[clean-status-automation] Found ${vehicles?.length || 0} vehicles past 24hr threshold`
    );

    const updatedVehicles: string[] = [];
    const skippedVehicles: string[] = [];

    // Idempotency per vehicle per day (so this job can run multiple times/day safely)
    const today = new Date().toISOString().split("T")[0];

    for (const vehicle of vehicles || []) {
      // Skip if already dirty for this specific reason
      if (vehicle.clean_status === "dirty" && vehicle.dirty_reason === "TIMEOUT_24H") {
        skippedVehicles.push(vehicle.unit);
        continue;
      }
