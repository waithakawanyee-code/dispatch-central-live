import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  driver_id: z.string().uuid(),
  new_pin: z.string().regex(/^\d{4}$/),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = claimsData.claims.sub as string;

  // Must be admin or dispatcher
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", callerId)
    .single();

  const allowed =
    callerProfile?.active &&
    (callerProfile.role === "ADMIN" || callerProfile.role === "DISPATCHER");

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { driver_id, new_pin } = parsed.data;

  const { data: driver, error: driverErr } = await admin
    .from("drivers")
    .select("id, name, code, auth_user_id, portal_auth_password")
    .eq("id", driver_id)
    .single();

  if (driverErr || !driver) {
    return new Response(JSON.stringify({ error: "Driver not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let authUserId = driver.auth_user_id;
  let authPassword = driver.portal_auth_password;

  if (!authUserId || !authPassword) {
    const syntheticEmail = `driver+${driver.id}@portal.local`;
    authPassword = randomPassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: { driver_id: driver.id, full_name: driver.name },
    });

    if (createErr || !created?.user) {
      // If user already exists (unique violation), look them up
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === syntheticEmail);
      if (!existing) {
        return new Response(
          JSON.stringify({ error: "Failed to provision auth user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      authUserId = existing.id;
      // Reset password to a fresh random one we control
      await admin.auth.admin.updateUserById(existing.id, { password: authPassword });
    } else {
      authUserId = created.user.id;
    }

    // Ensure profile exists as DRIVER
    await admin
      .from("profiles")
      .upsert(
        { id: authUserId, full_name: driver.name, role: "DRIVER", active: true },
        { onConflict: "id" },
      );

    // Ensure user_roles row
    await admin
      .from("user_roles")
      .upsert({ user_id: authUserId, role: "driver" }, { onConflict: "user_id,role" });
  } else {
    // Reset password on every PIN reset to keep it in sync
    authPassword = randomPassword();
    await admin.auth.admin.updateUserById(authUserId, { password: authPassword });
  }

  const pinHash = await bcrypt.hash(new_pin, 10);

  const { error: updateErr } = await admin
    .from("drivers")
    .update({
      pin_hash: pinHash,
      auth_user_id: authUserId,
      portal_auth_password: authPassword,
      portal_failed_attempts: 0,
      portal_locked_until: null,
    })
    .eq("id", driver.id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: "Failed to save PIN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("driver_portal_audit").insert({
    driver_id: driver.id,
    initials: driver.code,
    event_type: "pin_reset",
    success: true,
    detail: `by ${callerId}`,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
