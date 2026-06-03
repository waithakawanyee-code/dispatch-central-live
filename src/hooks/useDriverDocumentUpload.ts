import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  safeFileName,
} from "@/lib/employeeDocuments";

const BUCKET = "employee-documents";
const db = supabase as any;

export interface DriverUploadInput {
  driverId: string;
  file: File;
  doc_category: "license" | "medical" | "other";
  title: string;
  description?: string;
}

/**
 * Driver-side upload: storage FIRST, then row insert with final path.
 * Avoids needing UPDATE permission on employee_documents.
 */
export function useDriverUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DriverUploadInput) => {
      if (input.file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("File exceeds 10 MB limit");
      }
      if (input.file.type && !ALLOWED_MIME_TYPES.includes(input.file.type)) {
        throw new Error("Only PDF, JPG, or PNG files are allowed");
      }

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;

      // 1) Upload first under <driver_id>/<random>-<safe_name>
      const random = crypto.randomUUID();
      const path = `${input.driverId}/${random}-${safeFileName(input.file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type || undefined,
          upsert: false,
        });
      if (upErr) throw upErr;

      // 2) Insert row with final storage_path
      const { data: inserted, error: insErr } = await db
        .from("employee_documents")
        .insert({
          driver_id: input.driverId,
          doc_category: input.doc_category,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          storage_path: path,
          file_name: input.file.name,
          file_size_bytes: input.file.size,
          mime_type: input.file.type || null,
          visible_to_driver: true,
          requires_acknowledgment: false,
          uploaded_by: uid,
        })
        .select()
        .single();
      if (insErr) {
        // best-effort cleanup of orphan file
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }

      return inserted as { id: string; storage_path: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employee_documents", vars.driverId] });
      qc.invalidateQueries({ queryKey: ["driver_change_requests", vars.driverId] });
    },
  });
}

export async function submitCredentialUpdate(args: {
  request_type: "license" | "med_card";
  document_id: string;
  proposed: Record<string, unknown>;
}) {
  const { error } = await (supabase.rpc as any)("submit_credential_update", {
    p_request_type: args.request_type,
    p_document_id: args.document_id,
    p_proposed: args.proposed,
  });
  if (error) throw error;
}
