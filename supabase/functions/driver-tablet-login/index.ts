import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GENERIC_401 = { error: "Invalid credentials" };
const LOCKED_401 = { error: "Account temporarily locked. See dispatch." };

const BodySchema = z.object({
  initials: z.string().regex(/^[A-Za-z]{4}$/),
  pin: z.string().regex(/^\d{4}$/),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function audit(row: {
  driver_id: string | null;
  initials: string;
  event_type: string;
  success: boolean;
  ip: string | null;
  user_agent: string | null;
  detail?: string;
}) {
  try {
    await admin.from("driver_portal_audit").insert(row);
  } catch (_) {
    // never throw from audit
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const initials = parsed.data.initials.toUpperCase();
  const pin = parsed.data.pin;

  // Look up driver (service role bypasses RLS and column GRANT restrictions)
  const { data: driver, error: lookupErr } = await admin
    .from("drivers")
    .select(
      "id, name, code, is_active, pin_hash, auth_user_id, portal_locked_until, portal_failed_attempts, portal_auth_password",
    )
    .ilike("code", initials)
    .eq("is_active", true)
    .maybeSingle();

  if (lookupErr || !driver) {
    await audit({
      driver_id: null,
      initials,
      event_type: "login_failed",
      success: false,
      ip,
      user_agent: ua,
      detail: "no_match",
    });
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Locked?
  if (driver.portal_locked_until && new Date(driver.portal_locked_until) > new Date()) {
    await audit({
      driver_id: driver.id,
      initials,
      event_type: "login_locked",
      success: false,
      ip,
      user_agent: ua,
    });
    return new Response(JSON.stringify(LOCKED_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // No PIN set yet
  if (!driver.pin_hash || !driver.auth_user_id || !driver.portal_auth_password) {
    await audit({
      driver_id: driver.id,
      initials,
      event_type: "login_failed",
      success: false,
      ip,
      user_agent: ua,
      detail: "not_provisioned",
    });
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const matches = await bcrypt.compare(pin, driver.pin_hash);

  if (!matches) {
    // Count recent failures in last 15 min
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("driver_portal_audit")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", driver.id)
      .eq("event_type", "login_failed")
      .gte("created_at", since);

    const totalFailures = (count ?? 0) + 1; // +1 includes the one we're about to log
    const updates: Record<string, unknown> = {
      portal_failed_attempts: (driver.portal_failed_attempts ?? 0) + 1,
    };
    if (totalFailures >= 5) {
      updates.portal_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    await admin.from("drivers").update(updates).eq("id", driver.id);

    await audit({
      driver_id: driver.id,
      initials,
      event_type: "login_failed",
      success: false,
      ip,
      user_agent: ua,
      detail: "bad_pin",
    });
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Success — sign in via password to mint a real session
  const sessionClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // The synthetic email follows the pattern used by the provisioning function
  const syntheticEmail = `driver+${driver.id}@portal.local`;
  const { data: signIn, error: signInErr } = await sessionClient.auth.signInWithPassword({
    email: syntheticEmail,
    password: driver.portal_auth_password,
  });

  if (signInErr || !signIn?.session) {
    await audit({
      driver_id: driver.id,
      initials,
      event_type: "login_failed",
      success: false,
      ip,
      user_agent: ua,
      detail: "session_mint_failed",
    });
    return new Response(JSON.stringify(GENERIC_401), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin
    .from("drivers")
    .update({
      portal_failed_attempts: 0,
      portal_locked_until: null,
      last_portal_login_at: new Date().toISOString(),
    })
    .eq("id", driver.id);

  await audit({
    driver_id: driver.id,
    initials,
    event_type: "login_success",
    success: true,
    ip,
    user_agent: ua,
  });

  return new Response(
    JSON.stringify({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      driver: { id: driver.id, name: driver.name, code: driver.code },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
