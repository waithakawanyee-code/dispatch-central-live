# Driver Tablet Portal Build Plan

## Scope
Build a kiosk-style driver login + portal dashboard, plus admin PIN management. Uses bcrypt-hashed PINs stored on `drivers`, provisions a hidden Supabase auth user per driver, and gates the `/portal` route on a new `driver` role.

## 1. Database migration

Single migration:
- Add value `'driver'` to `app_role` enum
- Add value `'DRIVER'` to `profile_role` enum (so `profiles.role` can carry it for `is_driver()` checks)
- Add columns to `public.drivers`:
  - `pin_hash text`
  - `auth_user_id uuid` (unique, nullable)
  - `last_portal_login_at timestamptz`
  - `portal_failed_attempts int not null default 0`
  - `portal_locked_until timestamptz`
- Create `public.is_driver()` SECURITY DEFINER returning bool, checks `profiles.role = 'DRIVER'` AND active
- New table `public.driver_portal_audit` (id, driver_id, event_type, success bool, ip text, user_agent text, created_at) with GRANTs, RLS: admins/dispatchers SELECT, only service_role INSERT
- RLS update on `drivers`: allow driver to SELECT their own row via `auth_user_id = auth.uid()`

## 2. Edge functions

`supabase/functions/driver-tablet-login/index.ts` (`verify_jwt = false`)
- Input validation (zod): `initials` 4 uppercase letters, `pin` 4 digits
- Lookup driver by `UPPER(code)` + `is_active = true`
- Check `portal_locked_until > now()` → 401 generic
- `bcrypt.compare` against `pin_hash`
- On fail: increment `portal_failed_attempts`, audit; if 5+ failed audits in last 15 min → set `portal_locked_until = now() + 30 min`
- On success: reset attempts, set `last_portal_login_at`, audit, then create a Supabase session via `auth.admin.generateLink({ type: 'magiclink' })` to extract tokens — or use `signInWithPassword` against a derived synthetic password stored at provisioning time. **Decision: store a server-generated random password at provision time alongside `pin_hash`; use `signInWithPassword` server-side to mint a real session and return `{ access_token, refresh_token }`**
- Always return 401 `{ error: "Invalid credentials" }` on any auth failure; locked is `{ error: "Account temporarily locked. See dispatch." }`
- PIN never logged

`supabase/functions/driver-portal-provision/index.ts` (`verify_jwt = true`)
- Caller must be admin/dispatcher (check via service-role query on `profiles`)
- Input: `{ driver_id, new_pin }` (zod 4 digits)
- If `auth_user_id` null:
  - Generate synthetic email `driver+<driver_id>@portal.local`
  - Generate random strong password, store in a new column `drivers.portal_auth_password` (service-role only via RLS — never exposed to client)
  - `auth.admin.createUser` confirmed
  - Insert `profiles` row with `role = 'DRIVER'`
  - Insert `user_roles` row with `role = 'driver'`
  - Write `auth_user_id` back
- bcrypt hash PIN (cost 10), update `pin_hash`, reset attempts/lock
- Return `{ success: true }` — PIN never echoed back; client already has it

Add the column `portal_auth_password text` to drivers in the same migration (service-role only — RLS doesn't expose it to any role policy).

Config in `supabase/config.toml`:
```
[functions.driver-tablet-login]
verify_jwt = false

[functions.driver-portal-provision]
verify_jwt = true
```

## 3. Frontend — kiosk login `/tablet`

New page `src/pages/TabletLogin.tsx`:
- Full-screen landscape, dark high-contrast
- Logo top-center, live clock top-right
- Two large readonly inputs (initials, masked PIN dots)
- Active field highlighted
- On-screen keyboard component below: A–Z grid when initials focused, 0–9 grid when PIN focused, plus Backspace and Clear; 64px min targets
- Sign In enabled when initials.length===4 && pin.length===4
- Calls `supabase.functions.invoke('driver-tablet-login', { body: { initials, pin } })`
- On success: `supabase.auth.setSession({ access_token, refresh_token })`, toast `Welcome, <name>`, navigate `/portal`
- On 401: generic "Invalid credentials"

Add route in `App.tsx` outside `ProtectedRoute` (public).

## 4. Frontend — driver portal `/portal`

New `DriverProtectedRoute` that requires `profile.role === 'DRIVER'`. Add to `ProtectedRoute` allowedRoles enum (extend type to include `'DRIVER'`).

`src/pages/DriverPortal.tsx`:
- Top bar: "Hello, <first name>" + live clock + Sign Out
- 2×2 grid of placeholder cards: My Availability, Time Off, Flag Something for Today, My Folder — all "Coming soon"
- Footer text
- Idle timeout hook: 10 min warning modal, 12 min force `supabase.auth.signOut()` + navigate `/tablet`
- 12-hour session enforced by Supabase session expiry (default already ~1h; we'll just rely on idle + manual sign-out — note in code that absolute 12h is enforced by setting a `sessionExpiresAt` in localStorage and checking on focus)

## 5. Admin — Portal Access section

Extend `src/components/admin/DriverProfileForm.tsx` (or DriverProfileDialog) with a new "Portal Access" section:
- Shows `code`, `is_active`, `last_portal_login_at`, lock status badge
- "Set / Reset PIN" button → modal with: 4-digit input + "Generate Random PIN" button; on save invokes `driver-portal-provision`, then shows one-time copyable card with Print button (`window.print()` of a styled card)
- "Unlock Account" button shown only when `portal_locked_until > now()` → updates row directly (admin RLS already allows)
- Link to filtered audit log (new tab in Admin → Logs showing `driver_portal_audit` filtered by driver)

## 6. Files

New:
- `supabase/functions/driver-tablet-login/index.ts`
- `supabase/functions/driver-portal-provision/index.ts`
- `src/pages/TabletLogin.tsx`
- `src/pages/DriverPortal.tsx`
- `src/components/tablet/OnScreenKeyboard.tsx`
- `src/components/admin/DriverPortalAccessSection.tsx`
- `src/components/admin/SetPinDialog.tsx`
- `src/hooks/useIdleTimeout.ts`

Edited:
- `src/App.tsx` (routes, allowedRoles type)
- `src/components/ProtectedRoute.tsx` (DRIVER handling)
- `src/components/admin/DriverProfileDialog.tsx` (mount Portal Access section)
- `supabase/config.toml`

## Security notes
- PIN scrubbed from all logs (no `console.log` of body); login function only logs `{ initials, success, locked }`
- `portal_auth_password` column never exposed via any RLS policy
- Audit inserts use service_role
- Rate-limit lock uses audit log count, not just the counter (resistant to row reset races)

## Risks / open items
- Confirm bcrypt deno import: use `https://deno.land/x/bcrypt@v0.4.1/mod.ts`
- The 12h absolute session is approximated via localStorage timestamp + idle check; Supabase tokens auto-refresh, so we explicitly sign out when `now > loginAt + 12h`