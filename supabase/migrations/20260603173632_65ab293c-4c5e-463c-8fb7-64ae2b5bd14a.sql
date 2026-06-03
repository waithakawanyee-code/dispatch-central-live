
-- 1. New profile/compliance columns on drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiration date,
  ADD COLUMN IF NOT EXISTS med_card_expiration date;

-- 2. Change-request / profile-activity table
CREATE TABLE IF NOT EXISTS public.driver_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('contact_update','license','med_card','other_document')),
  related_document_id uuid REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  requires_approval boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_applied')),
  submitted_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_profile_change_requests TO authenticated;
GRANT ALL ON public.driver_profile_change_requests TO service_role;

ALTER TABLE public.driver_profile_change_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dpcr_pending ON public.driver_profile_change_requests(status, submitted_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dpcr_driver ON public.driver_profile_change_requests(driver_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dpcr_related_doc ON public.driver_profile_change_requests(related_document_id);

DROP POLICY IF EXISTS "Drivers see own change requests" ON public.driver_profile_change_requests;
CREATE POLICY "Drivers see own change requests" ON public.driver_profile_change_requests
  FOR SELECT TO authenticated
  USING (driver_id = public.current_driver_id() OR public.is_dispatcher_or_admin());

DROP POLICY IF EXISTS "Staff manage change requests" ON public.driver_profile_change_requests;
CREATE POLICY "Staff manage change requests" ON public.driver_profile_change_requests
  FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin())
  WITH CHECK (public.is_dispatcher_or_admin());

-- 3. Let drivers add their own docs (license/medical/other only) to their folder
DROP POLICY IF EXISTS "Drivers create own documents" ON public.employee_documents;
CREATE POLICY "Drivers create own documents" ON public.employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = public.current_driver_id()
    AND visible_to_driver = true
    AND requires_acknowledgment = false
    AND doc_category IN ('license','medical','other')
  );

-- 4. Let drivers upload files to their own storage folder
DROP POLICY IF EXISTS "Drivers upload to own folder" ON storage.objects;
CREATE POLICY "Drivers upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = public.current_driver_id()::text
  );

-- 5. Realtime for approvals
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_profile_change_requests;

-- A. Driver self-edits contact info. Whitelisted columns only. Logs the change.
CREATE OR REPLACE FUNCTION public.update_my_driver_profile(p jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM public.drivers WHERE auth_user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'No driver linked to current user';
  END IF;

  UPDATE public.drivers SET
    name                            = COALESCE(p->>'name', name),
    address                         = CASE WHEN p ? 'address' THEN NULLIF(p->>'address','') ELSE address END,
    date_of_birth                   = CASE WHEN p ? 'date_of_birth' THEN NULLIF(p->>'date_of_birth','')::date ELSE date_of_birth END,
    phone                           = CASE WHEN p ? 'phone' THEN NULLIF(p->>'phone','') ELSE phone END,
    email                           = CASE WHEN p ? 'email' THEN NULLIF(p->>'email','') ELSE email END,
    emergency_contact_name          = CASE WHEN p ? 'emergency_contact_name' THEN NULLIF(p->>'emergency_contact_name','') ELSE emergency_contact_name END,
    emergency_contact_phone         = CASE WHEN p ? 'emergency_contact_phone' THEN NULLIF(p->>'emergency_contact_phone','') ELSE emergency_contact_phone END,
    emergency_contact_relationship  = CASE WHEN p ? 'emergency_contact_relationship' THEN NULLIF(p->>'emergency_contact_relationship','') ELSE emergency_contact_relationship END,
    emergency_contact_name_2         = CASE WHEN p ? 'emergency_contact_name_2' THEN NULLIF(p->>'emergency_contact_name_2','') ELSE emergency_contact_name_2 END,
    emergency_contact_phone_2        = CASE WHEN p ? 'emergency_contact_phone_2' THEN NULLIF(p->>'emergency_contact_phone_2','') ELSE emergency_contact_phone_2 END,
    emergency_contact_relationship_2 = CASE WHEN p ? 'emergency_contact_relationship_2' THEN NULLIF(p->>'emergency_contact_relationship_2','') ELSE emergency_contact_relationship_2 END,
    updated_at = now()
  WHERE id = v_driver_id;

  INSERT INTO public.driver_profile_change_requests
    (driver_id, request_type, proposed_changes, requires_approval, status, submitted_by, reviewed_at)
  VALUES
    (v_driver_id, 'contact_update', p, false, 'auto_applied', auth.uid(), now());
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_my_driver_profile(jsonb) TO authenticated;

-- B. Driver proposes a credential update. NEVER writes to drivers.
CREATE OR REPLACE FUNCTION public.submit_credential_update(
  p_request_type text,
  p_document_id uuid,
  p_proposed jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_req_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM public.drivers WHERE auth_user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'No driver linked'; END IF;
  IF p_request_type NOT IN ('license','med_card') THEN RAISE EXCEPTION 'Invalid request type'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.employee_documents WHERE id = p_document_id AND driver_id = v_driver_id) THEN
    RAISE EXCEPTION 'Document does not belong to current driver';
  END IF;

  INSERT INTO public.driver_profile_change_requests
    (driver_id, request_type, related_document_id, proposed_changes, requires_approval, status, submitted_by)
  VALUES
    (v_driver_id, p_request_type, p_document_id, p_proposed, true, 'pending', auth.uid())
  RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_credential_update(text, uuid, jsonb) TO authenticated;

-- C. Admin approves/rejects. Only on approve do compliance fields actually change.
CREATE OR REPLACE FUNCTION public.review_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req public.driver_profile_change_requests;
  c jsonb;
BEGIN
  IF NOT public.is_dispatcher_or_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_req FROM public.driver_profile_change_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  IF p_approve THEN
    c := v_req.proposed_changes;
    UPDATE public.drivers SET
      name               = COALESCE(NULLIF(c->>'name',''), name),
      date_of_birth      = COALESCE(NULLIF(c->>'date_of_birth','')::date, date_of_birth),
      address            = COALESCE(NULLIF(c->>'address',''), address),
      license_number     = COALESCE(NULLIF(c->>'license_number',''), license_number),
      license_expiration = COALESCE(NULLIF(c->>'license_expiration','')::date, license_expiration),
      med_card_expiration= COALESCE(NULLIF(c->>'med_card_expiration','')::date, med_card_expiration),
      updated_at = now()
    WHERE id = v_req.driver_id;

    UPDATE public.driver_profile_change_requests
      SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), review_note=p_note
      WHERE id = p_request_id;
  ELSE
    UPDATE public.driver_profile_change_requests
      SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), review_note=p_note
      WHERE id = p_request_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_change_request(uuid, boolean, text) TO authenticated;
