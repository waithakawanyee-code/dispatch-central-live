import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDriverUploadDocument } from "@/hooks/useDriverDocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "@/lib/employeeDocuments";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function UploadOtherDialog({ open, onOpenChange }: Props) {
  const { driver } = useCurrentDriver();
  const { toast } = useToast();
  const upload = useDriverUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setTitle("");
      setDescription("");
      setSubmitting(false);
    }
  }, [open]);

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
    if (!driver?.id || !file || !title.trim()) return;
    setSubmitting(true);
    try {
      await upload.mutateAsync({
        driverId: driver.id,
        file,
        doc_category: "other",
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast({ title: "Document uploaded" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input type="file" accept="image/png,image/jpeg,application/pdf" onChange={onPickFile} />
            {file && (
              <div className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!file || !title.trim() || submitting}>
            {submitting ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
