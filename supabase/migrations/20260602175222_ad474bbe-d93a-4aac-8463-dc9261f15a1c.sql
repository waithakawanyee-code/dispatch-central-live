
CREATE POLICY "Drivers read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      (storage.foldername(name))[1] = public.current_driver_id()::text
      OR public.is_dispatcher_or_admin()
    )
  );

CREATE POLICY "Staff write employee documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND public.is_dispatcher_or_admin()
  );

CREATE POLICY "Staff update employee documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND public.is_dispatcher_or_admin()
  );

CREATE POLICY "Staff delete employee documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND public.is_dispatcher_or_admin()
  );
