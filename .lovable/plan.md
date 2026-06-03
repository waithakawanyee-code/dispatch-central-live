
# My Folder Hub — Profile + Document Uploads + Approvals

Implements your two-lane model verbatim: self-edit contact info logs to an activity feed; license / med-card changes are *proposed* via document upload and only land on `drivers` after a dispatcher approves. Gating is enforced in SECURITY DEFINER SQL functions, not the frontend.

## Migration (single migration, awaits your approval)

Schema:
- `drivers`: add `date_of_birth date`, `license_number text`, `license_expiration date`, `med_card_expiration date`
- New `driver_profile_change_requests` table (id, driver_id, request_type, related_document_id, proposed_changes jsonb, requires_approval, status, submitted_by/at, reviewed_by/at, review_note) + the two partial indexes from your plan + GRANTs to authenticated/service_role
- RLS: drivers see own rows, staff manage all; drivers never insert directly (only via RPC)
- `employee_documents`: new INSERT policy letting drivers create their own `license` / `medical` / `other` rows with `visible_to_driver=true`, `requires_acknowledgment=false`
- `storage.objects`: new INSERT policy on `employee-documents` bucket scoped to `(storage.foldername(name))[1] = current_driver_id()::text`

RPCs (all SECURITY DEFINER, search_path = public, granted to authenticated):
- `update_my_driver_profile(jsonb)` — whitelisted contact-info update, writes the `drivers` row and logs an `auto_applied` row in change_requests
- `submit_credential_update(request_type, document_id, proposed jsonb)` — verifies the doc belongs to caller, inserts a `pending` request. Never touches `drivers`.
- `review_change_request(id, approve, note?)` — admin/dispatcher only; on approve copies whitelisted compliance fields onto `drivers`; on reject just records the note

Pre-flight note: existing `employee_documents.doc_category` check already includes `license`, `medical`, `other` from Phase 3, so no constraint change needed.

## Part A — My Folder hub + Profile tab

Restructure `/portal/folder` into a tabbed shell:
- Tab **My Info** (new) — profile form
- Tab **My Documents** (existing Phase 3 folder, unchanged)

Profile form (`PortalProfileTab.tsx`):
- Group 1 "My Information" (editable): Full Name, DOB (date picker), Address, Phone, Email, Emergency Contact 1 (name/phone/relationship — name + phone required), "+ Add another emergency contact" reveals Contact 2 with Remove link
- Save button enabled only on dirty; calls `supabase.rpc('update_my_driver_profile', { p: payload })` with only editable keys — never direct table update
- Group 2 "Compliance (managed by dispatch)" READ-ONLY: License #, License Expiration, DOT Medical Card Expiration with helper "To update these, upload a new document under My Documents." Amber "Expiring soon" chip ≤30 days, red "Expired" chip if past
- Visually: editable group normal; read-only group has subtle locked treatment (muted bg, lock icon)
- Toast on save: "Profile updated — your dispatcher has been notified"

## Part B — Document uploads (My Documents tab)

Primary "Upload Document" button → 3-card type picker: Driver's License, DOT Medical Card, Other.

Shared mechanics (`useDriverDocumentUpload` hook):
- Accept PDF/JPG/PNG, max 10MB, client AND server-validated
- Upload file to `employee-documents/<driver_id>/<uuid>-<safe_filename>` FIRST, then insert `employee_documents` row with the resulting `storage_path` (avoids needing UPDATE on storage)
- All driver-created docs: `visible_to_driver=true`, `requires_acknowledgment=false`

Option 1 — License (`UploadLicenseDialog.tsx`):
- After file pick, show "Enter information as shown on your license" form
- Prefill: name, DOB, address, license_number (from driver row). **Expiration always blank.**
- Required: any blank prefill + expiration (always)
- Submit: insert doc row (category `license`, title `Driver's License - uploaded <date>`) → `submit_credential_update('license', doc.id, { name, date_of_birth, address, license_number, license_expiration })`
- Confirm: "Submitted for review. Your dispatcher will confirm the new expiration date before it updates your profile."

Option 2 — Medical (`UploadMedCardDialog.tsx`):
- Only input: Expiration Date (required)
- Submit: insert doc row (category `medical`) → `submit_credential_update('med_card', doc.id, { med_card_expiration })`
- Confirm: "Submitted for review. Dispatch will confirm before your med card expiration updates."

Option 3 — Other (`UploadOtherDialog.tsx`):
- Title (required), Description (optional), file
- Insert doc only (category `other`). No gating, no change request.

My Documents list:
- Driver's own docs grouped by category, newest first
- Join to `driver_profile_change_requests` by `related_document_id` to show status pill: amber "Pending dispatch review", green "Confirmed", red "Not accepted" + review_note
- Open via 5-min signed URL

## Part C — Admin approvals inbox

Widget on `/drivers` dispatch board (`ProfileApprovalsWidget.tsx`):
- Realtime count of `driver_profile_change_requests` where `status='pending'`
- Tap → `/admin/approvals`

Page `/admin/approvals` (admin+dispatcher route):
- Tab **Needs Review**: pending rows, oldest first
  - Driver name + code, type chip, submitted date
  - Diff block: for each proposed key, show current value (struck-through/muted) → new value (bold). Pull current from `drivers`, proposed from `proposed_changes`
  - "View Document" (signed URL) when `related_document_id` present
  - **Approve** → `review_change_request(id, true, note?)`; row turns green, list re-queries
  - **Reject** → requires note → `review_change_request(id, false, note)`
- Tab **Recent Activity**: rows with status in (`auto_applied`,`approved`,`rejected`), newest first, read-only audit trail
- Realtime channel on `driver_profile_change_requests` keeps both tabs live

Admin driver profile page (`DriverProfile.tsx`):
- Surface new compliance fields (license #, license exp, med card exp, DOB) in editable form — admins are trusted, direct update is fine
- Under each compliance date, "Last confirmed: <date> by <name>" derived from the latest approved request touching that field

## File map

New:
- `src/pages/PortalFolder.tsx` — refactored to tab shell (Info / Documents)
- `src/components/portal/PortalProfileTab.tsx`
- `src/components/portal/PortalDocumentsTab.tsx` (extracted from current PortalFolder)
- `src/components/portal/UploadTypePicker.tsx`
- `src/components/portal/UploadLicenseDialog.tsx`
- `src/components/portal/UploadMedCardDialog.tsx`
- `src/components/portal/UploadOtherDialog.tsx`
- `src/hooks/useDriverDocumentUpload.ts`
- `src/hooks/useProfileChangeRequests.ts`
- `src/pages/AdminApprovals.tsx`
- `src/components/admin/ApprovalRow.tsx`
- `src/components/admin/ApprovalDiff.tsx`
- `src/components/dispatch/ProfileApprovalsWidget.tsx`

Edited:
- `src/App.tsx` — register `/admin/approvals` (admin+dispatcher)
- `src/pages/Drivers.tsx` — mount ProfileApprovalsWidget
- `src/pages/DriverProfile.tsx` — add compliance section + "last confirmed" lines
- `src/components/admin/DriverProfileForm.tsx` — add DOB / license # / license exp / med card exp fields for admin direct edit

## Notes / deviations
- "Notify admins" stays inbox-only for now per your plan; email/SMS push is a later phase.
- Realtime subscription added to the approvals page + widget so dispatcher sees new requests without refresh (matches the pattern used by the call-outs banner).
- I will not add automatic email notifications, push notifications, or any admin-only constraint that requires `related_document_id` on direct edits — flagged in your plan as habits, not code.

Ready to switch to build mode and start with the migration?
