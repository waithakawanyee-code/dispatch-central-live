import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useDriverUploadDocument,
  submitCredentialUpdate,
} from "@/hooks/useDriverDocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/employeeDocuments";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Form {
  name: string;
  date_of_birth: string;
  address: string;
  license_number: string;
  license_expiration: string;
}

export function UploadLicenseDialog({ open, onOpenChange }: Props) {
  const { driver } = useCurrentDriver();
  const { toast } = useToast();
  const upload = useDriverUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Form>({
    name: "",
    date_of_birth: "",
    address: "",
    license_number: "",
    license_expiration: "",
  });
  const [prefilled, setPrefilled] = useState<Partial<Form>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !driver?.id) return;
    setFile(null);
    setSubmitting(false);
    (async () => {
      const { data } = await (supabase as any)
        .from("drivers")
        .select("name, date_of_birth, address, license_number")
        .eq("id", driver.id)
        .maybeSingle();
      const d = (data ?? {}) as Partial<Form>;
      const pre: Partial<Form> = {
        name: d.name ?? "",
        date_of_birth: d.date_of_birth ?? "",
        address: d.address ?? "",
        license_number: d.license_number ?? "",
      };
      setPrefilled(pre);
      setForm({
        name: pre.name ?? "",
        date_of_birth: pre.date_of_birth ?? "",
        address: pre.address ?? "",
        license_number: pre.license_number ?? "",
        license_expiration: "",
      });
    })();
  }, [open, driver?.id]);

  const requiredMissing =
    !form.name.trim() ||
    !form.date_of_birth ||
    !form.address.trim() ||
    !form.license_number.trim() ||
    !form.license_expiration;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return setFile(null);
    if (f.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
      return;
    }
    if (f.type && !ALLOWED_MIME_TYPES.includes(f.type)) {
      toast({ title: "Unsupported type", description: "PDF, JPG, or PNG only", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const onSubmit = async () => {
    if (!driver?.id || !file || requiredMissing) return;
    setSubmitting(true);
    try {
      const today = new Date().toLocaleDateString();
      const doc = await upload.mutateAsync({
        driverId: driver.id,
        file,
        doc_category: "license",
        title: `Driver's License - uploaded ${today}`,
      });
      await submitCredentialUpdate({
        request_type: "license",
        document_id: doc.id,
        proposed: {
          name: form.name.trim(),
          date_of_birth: form.date_of_birth,
          address: form.address.trim(),
          license_number: form.license_number.trim(),
          license_expiration: form.license_expiration,
        },
      });
      toast({
        title: "Submitted for review",
        description:
          "Your dispatcher will confirm the new expiration date before it updates your profile.",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Submit failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Driver's License</DialogTitle>
          <DialogDescription>
            Please confirm each field matches your new license and update anything that has
            changed. Expiration date is always required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>License Photo or PDF</Label>
            <Input type="file" accept="image/png,image/jpeg,application/pdf" onChange={onPickFile} />
            {file && (
              <div className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          {file && (
            <>
              <FieldRow label="Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Date of Birth" required>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Address" required>
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="License Number" required>
                <Input
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Expiration Date" required>
                <Input
                  type="date"
                  value={form.license_expiration}
                  onChange={(e) => setForm({ ...form, license_expiration: e.target.value })}
                />
              </FieldRow>
              <p className="text-xs text-muted-foreground">
                Nothing here updates your profile yet. Dispatch will confirm before any field
                changes.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!file || requiredMissing || submitting}>
            {submitting ? "Submitting…" : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
