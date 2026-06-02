import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type EmployeeDocument,
  type EmployeeDocumentAck,
  type DocCategory,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  safeFileName,
} from "@/lib/employeeDocuments";

const BUCKET = "employee-documents";
// employee_documents not in generated types yet — use any client
const db = supabase as any;

export function useEmployeeDocuments(driverId: string | undefined, opts?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["employee_documents", driverId, opts?.includeArchived ?? false],
    enabled: !!driverId,
    queryFn: async () => {
      let q = db
        .from("employee_documents")
        .select("*")
        .eq("driver_id", driverId)
        .order("uploaded_at", { ascending: false });
      if (!opts?.includeArchived) q = q.is("archived_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EmployeeDocument[];
    },
  });
}

export function useDocumentAcks(driverId: string | undefined) {
  return useQuery({
    queryKey: ["employee_document_acks", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await db
        .from("employee_document_acknowledgements")
        .select("*")
        .eq("driver_id", driverId);
      if (error) throw error;
      return (data ?? []) as EmployeeDocumentAck[];
    },
  });
}

export async function getSignedDocUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create signed URL");
  return data.signedUrl;
}

export interface UploadDocumentInput {
  driverId: string;
  file: File;
  doc_category: DocCategory;
  title: string;
  description?: string;
  effective_date?: string | null;
  visible_to_driver: boolean;
  requires_acknowledgment: boolean;
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      if (input.file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("File exceeds 10 MB limit");
      }
      if (input.file.type && !ALLOWED_MIME_TYPES.includes(input.file.type)) {
        throw new Error("Only PDF, JPG, or PNG files are allowed");
      }

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;

      // 1) Insert row with placeholder path
      const { data: inserted, error: insertErr } = await db
        .from("employee_documents")
        .insert({
          driver_id: input.driverId,
          doc_category: input.doc_category,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          storage_path: "",
          file_name: input.file.name,
          file_size_bytes: input.file.size,
          mime_type: input.file.type || null,
          visible_to_driver: input.visible_to_driver,
          requires_acknowledgment: input.requires_acknowledgment,
          effective_date: input.effective_date || null,
          uploaded_by: uid,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const doc = inserted as EmployeeDocument;
      const path = `${input.driverId}/${doc.id}-${safeFileName(input.file.name)}`;

      // 2) Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { contentType: input.file.type || undefined, upsert: false });
      if (uploadErr) {
        // best-effort cleanup
        await db.from("employee_documents").delete().eq("id", doc.id);
        throw uploadErr;
      }

      // 3) Update path
      const { error: updErr } = await db
        .from("employee_documents")
        .update({ storage_path: path })
        .eq("id", doc.id);
      if (updErr) throw updErr;

      return doc;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employee_documents", vars.driverId] });
      qc.invalidateQueries({ queryKey: ["pending_acks"] });
    },
  });
}

export function useArchiveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await db
        .from("employee_documents")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
      qc.invalidateQueries({ queryKey: ["pending_acks"] });
    },
  });
}

export function useUpdateDocumentMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string | null;
      effective_date?: string | null;
      visible_to_driver?: boolean;
      requires_acknowledgment?: boolean;
      doc_category?: DocCategory;
    }) => {
      const { id, ...rest } = input;
      const { error } = await db.from("employee_documents").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
    },
  });
}

export function useAcknowledgeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { document_id: string; driver_id: string; typed_signature: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await db.from("employee_document_acknowledgements").insert({
        document_id: input.document_id,
        driver_id: input.driver_id,
        acknowledged_by: uid,
        typed_signature: input.typed_signature.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employee_document_acks", vars.driver_id] });
      qc.invalidateQueries({ queryKey: ["pending_acks"] });
    },
  });
}

export async function logDocViewed(driverId: string, documentId: string, category: string) {
  // Best-effort audit log; only required for disciplinary, but we log all opens.
  try {
    await db.from("driver_portal_audit").insert({
      driver_id: driverId,
      event_type: "doc_viewed",
      success: true,
      detail: `doc:${documentId} category:${category}`,
    });
  } catch {
    // ignore
  }
}

// Pending acknowledgments aged > 3 days, for admin/dispatcher dashboard
export function usePendingAcknowledgments() {
  return useQuery({
    queryKey: ["pending_acks"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: docs, error } = await db
        .from("employee_documents")
        .select("id, title, driver_id, doc_category, uploaded_at")
        .eq("requires_acknowledgment", true)
        .eq("visible_to_driver", true)
        .is("archived_at", null)
        .lte("uploaded_at", cutoff)
        .order("uploaded_at", { ascending: true });
      if (error) throw error;
      const docList = (docs ?? []) as Array<{
        id: string; title: string; driver_id: string; doc_category: string; uploaded_at: string;
      }>;
      if (docList.length === 0) return [];

      const ids = docList.map((d) => d.id);
      const { data: acks } = await db
        .from("employee_document_acknowledgements")
        .select("document_id")
        .in("document_id", ids);
      const ackSet = new Set<string>((acks ?? []).map((a: any) => a.document_id));
      const pending = docList.filter((d) => !ackSet.has(d.id));
      if (pending.length === 0) return [];

      const driverIds = [...new Set(pending.map((p) => p.driver_id))];
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name")
        .in("id", driverIds);
      const dmap = new Map<string, string>((drivers ?? []).map((d: any) => [d.id, d.name]));
      return pending.map((p) => ({ ...p, driver_name: dmap.get(p.driver_id) ?? "Unknown" }));
    },
    refetchInterval: 60_000,
  });
}
