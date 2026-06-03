import { useState } from "react";
import { ExternalLink, IdCard, HeartPulse, UserCog, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApprovalDiff } from "./ApprovalDiff";
import {
  type ChangeRequest,
  useReviewChangeRequest,
} from "@/hooks/useProfileChangeRequests";
import { getSignedDocUrl } from "@/hooks/useEmployeeDocuments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApprovalRowProps {
  request: ChangeRequest;
  driverName?: string;
  driverCode?: string | null;
  currentDriver: Record<string, any> | null;
  readOnly?: boolean;
}

function typeMeta(t: ChangeRequest["request_type"]) {
  if (t === "license") return { label: "License", icon: IdCard, tone: "text-primary" };
  if (t === "med_card") return { label: "Med Card", icon: HeartPulse, tone: "text-primary" };
  if (t === "contact_update")
    return { label: "Contact Update", icon: UserCog, tone: "text-muted-foreground" };
  return { label: "Document", icon: UserCog, tone: "text-muted-foreground" };
}

export function ApprovalRow({
  request,
  driverName,
  driverCode,
  currentDriver,
  readOnly,
}: ApprovalRowProps) {
  const review = useReviewChangeRequest();
  const { toast } = useToast();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");

  const meta = typeMeta(request.request_type);
  const Icon = meta.icon;

  const viewDoc = async () => {
    if (!request.related_document_id) return;
    try {
      if (!docPath) {
        const { data } = await (supabase as any)
          .from("employee_documents")
          .select("storage_path")
          .eq("id", request.related_document_id)
          .maybeSingle();
        if (!data?.storage_path) throw new Error("Document not found");
        setDocPath(data.storage_path);
        const url = await getSignedDocUrl(data.storage_path);
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const url = await getSignedDocUrl(docPath);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      toast({ title: "Could not open document", description: e.message, variant: "destructive" });
    }
  };

  const approve = async () => {
    try {
      await review.mutateAsync({ id: request.id, approve: true });
      toast({ title: "Approved" });
    } catch (e: any) {
      toast({ title: "Could not approve", description: e.message, variant: "destructive" });
    }
  };

  const doReject = async () => {
    if (note.trim().length < 2) {
      toast({ title: "Note required", description: "Add a short reason", variant: "destructive" });
      return;
    }
    try {
      await review.mutateAsync({ id: request.id, approve: false, note: note.trim() });
      toast({ title: "Rejected" });
      setRejectOpen(false);
      setNote("");
    } catch (e: any) {
      toast({ title: "Could not reject", description: e.message, variant: "destructive" });
    }
  };

  const submittedAt = new Date(request.submitted_at).toLocaleString();
  const decidedAt = request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : null;

  const statusTone =
    request.status === "approved"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
      : request.status === "rejected"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : request.status === "auto_applied"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-amber-500/10 text-amber-500 border-amber-500/30";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className={`h-5 w-5 ${meta.tone}`} />
          </div>
          <div>
            <div className="font-semibold">
              {driverName ?? "Unknown driver"}
              {driverCode && (
                <span className="ml-2 text-xs font-mono text-muted-foreground">{driverCode}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {meta.label} · Submitted {submittedAt}
              {decidedAt && ` · Decided ${decidedAt}`}
            </div>
          </div>
        </div>
        <Badge className={`border ${statusTone}`}>{request.status}</Badge>
      </div>

      <ApprovalDiff current={currentDriver ?? {}} proposed={request.proposed_changes ?? {}} />

      {request.review_note && (
        <div className="text-sm rounded-md bg-muted/40 border border-border px-3 py-2">
          <span className="font-medium">Note:</span> {request.review_note}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {request.related_document_id ? (
          <Button variant="outline" size="sm" onClick={viewDoc} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> View Document
          </Button>
        ) : (
          <span />
        )}
        {!readOnly && request.status === "pending" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(true)}
              disabled={review.isPending}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" onClick={approve} disabled={review.isPending} className="gap-1.5">
              {review.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject change request</DialogTitle>
            <DialogDescription>
              Add a short note explaining why. The driver will see this.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Photo is unclear — please upload a sharper image."
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doReject} disabled={review.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
