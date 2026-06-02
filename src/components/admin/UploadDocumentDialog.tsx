import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOC_CATEGORIES,
  type DocCategory,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXT_HINT,
} from "@/lib/employeeDocuments";
import { useUploadDocument } from "@/hooks/useEmployeeDocuments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  driverId: string;
  driverName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function UploadDocumentDialog({ driverId, driverName, open, onOpenChange }: Props) {
  const upload = useUploadDocument();
  const { toast } = useToast();
  const [category, setCategory] = useState<DocCategory>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [visibleToDriver, setVisibleToDriver] = useState(true);
  const [requiresAck, setRequiresAck] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Auto-on requires_acknowledgment when category is disciplinary
  useEffect(() => {
    if (category === "disciplinary") setRequiresAck(true);
  }, [category]);

  const reset = () => {
    setCategory("other");
    setTitle("");
    setDescription("");
    setEffectiveDate("");
    setVisibleToDriver(true);
    setRequiresAck(false);
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "File too large", description: "Max 10 MB", variant: "destructive" });
      return;
    }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "PDF, JPG, or PNG only", variant: "destructive" });
      return;
    }
    try {
      await upload.mutateAsync({
        driverId,
        file,
        doc_category: category,
        title,
        description: description || undefined,
        effective_date: effectiveDate || null,
        visible_to_driver: visibleToDriver,
        requires_acknowledgment: requiresAck,
      });
      toast({ title: "Document uploaded" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document — {driverName}</DialogTitle>
          <DialogDescription>{ALLOWED_EXT_HINT}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Safety Review 2026" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Effective Date</Label>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Visible to driver</div>
              <div className="text-xs text-muted-foreground">If off, only staff can see this document.</div>
            </div>
            <Switch checked={visibleToDriver} onCheckedChange={setVisibleToDriver} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Requires acknowledgment</div>
              <div className="text-xs text-muted-foreground">Driver must sign before it clears.</div>
            </div>
            <Switch checked={requiresAck} onCheckedChange={setRequiresAck} />
          </div>
          <div className="space-y-1.5">
            <Label>File *</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <div className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!file || !title.trim() || upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
