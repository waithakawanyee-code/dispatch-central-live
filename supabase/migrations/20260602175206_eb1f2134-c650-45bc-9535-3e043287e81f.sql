
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  doc_category text NOT NULL CHECK (doc_category IN (
    'disciplinary','commendation','review','training_certificate',
    'license','medical','onboarding','separation','other'
  )),
  title text NOT NULL,
  description text,
  storage_path text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  visible_to_driver boolean NOT NULL DEFAULT true,
  requires_acknowledgment boolean NOT NULL DEFAULT false,
  effective_date date,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_driver_cat
  ON public.employee_documents(driver_id, doc_category)
  WHERE archived_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers see own visible docs" ON public.employee_documents
  FOR SELECT TO authenticated
  USING (
    (driver_id = public.current_driver_id()
      AND visible_to_driver = true
      AND archived_at IS NULL)
    OR public.is_dispatcher_or_admin()
  );

CREATE POLICY "Staff manage all docs" ON public.employee_documents
  FOR ALL TO authenticated
  USING (public.is_dispatcher_or_admin())
  WITH CHECK (public.is_dispatcher_or_admin());

CREATE TABLE IF NOT EXISTS public.employee_document_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  acknowledged_by uuid NOT NULL REFERENCES auth.users(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  typed_signature text NOT NULL,
  UNIQUE(document_id, driver_id)
);

GRANT SELECT, INSERT ON public.employee_document_acknowledgements TO authenticated;
GRANT ALL ON public.employee_document_acknowledgements TO service_role;

ALTER TABLE public.employee_document_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers see own acks" ON public.employee_document_acknowledgements
  FOR SELECT TO authenticated
  USING (driver_id = public.current_driver_id() OR public.is_dispatcher_or_admin());

CREATE POLICY "Drivers create own acks" ON public.employee_document_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id = public.current_driver_id()
    AND acknowledged_by = auth.uid()
  );

CREATE POLICY "Staff create acks" ON public.employee_document_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_dispatcher_or_admin());
