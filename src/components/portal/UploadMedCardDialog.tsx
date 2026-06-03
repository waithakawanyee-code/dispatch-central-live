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

export function UploadMedCardDialog({ open, onOpenChange }: Props) {
  const { driver } = useCurrentDriver();
  const { toast } = useToast();
  const upload = useDriverUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [expiration, setExpiration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setExpiration("");
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
    if (!driver?.id || !file || !expiration) return;
    setSubmitting(true);
    try {
      const today = new Date().toLocaleDateString();
      const doc = await upload.mutateAsync({
        driverId: driver.id,
        file,
        doc_category: "medical",
        title: `DOT Medical Card - uploaded ${today}`,
      });
      await submitCredentialUpdate({
        request_type: "med_card",
        document_id: doc.id,
        proposed: { med_card_expiration: expiration },
      });
      toast({
        title: "Submitted for review",
        description: "Dispatch will confirm before your med card expiration updates.",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload DOT Medical Card</DialogTitle>
          <DialogDescription>
            Attach a clear photo or PDF and enter the expiration date printed on the card.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Med Card Photo or PDF</Label>
            <Input type="file" accept="image/png,image/jpeg,application/pdf" onChange={onPickFile} />
            {file && (
              <div className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>

          {file && (
            <div className="space-y-1.5">
              <Label>
                Expiration Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This does not change your profile until dispatch confirms.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!file || !expiration || submitting}>
            {submitting ? "Submitting…" : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
