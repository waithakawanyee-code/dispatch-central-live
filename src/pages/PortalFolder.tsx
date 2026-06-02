import { useMemo, useState } from "react";
import { Loader2, ChevronDown, Eye, Flag, ShieldCheck, FileText } from "lucide-react";
import { PortalShell } from "@/components/tablet/PortalShell";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import {
  useEmployeeDocuments,
  useDocumentAcks,
  useAcknowledgeDocument,
  getSignedDocUrl,
  logDocViewed,
} from "@/hooks/useEmployeeDocuments";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DOC_CATEGORIES,
  categoryMeta,
  formatFileSize,
  type EmployeeDocument,
} from "@/lib/employeeDocuments";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PortalFolder() {
  const { driver, loading: driverLoading } = useCurrentDriver();
  const { data: docs = [], isLoading } = useEmployeeDocuments(driver?.id);
  const { data: acks = [] } = useDocumentAcks(driver?.id);
  const ackedSet = useMemo(() => new Set(acks.map((a) => a.document_id)), [acks]);
  const ack = useAcknowledgeDocument();
  const { toast } = useToast();

  const [viewing, setViewing] = useState<{ doc: EmployeeDocument; url: string } | null>(null);
  const [signature, setSignature] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeDocument[]>();
    for (const d of docs) {
      if (!map.has(d.doc_category)) map.set(d.doc_category, []);
      map.get(d.doc_category)!.push(d);
    }
    return map;
  }, [docs]);

  const handleOpen = async (doc: EmployeeDocument) => {
    try {
      const url = await getSignedDocUrl(doc.storage_path);
      setViewing({ doc, url });
      setSignature("");
      setConfirmed(false);
      if (driver?.id) await logDocViewed(driver.id, doc.id, doc.doc_category);
    } catch (e: any) {
      toast({ title: "Could not open document", description: e.message, variant: "destructive" });
    }
  };

  const handleAcknowledge = async () => {
    if (!viewing || !driver) return;
    if (!confirmed) return;
    if (signature.trim().length < 2) return;
    setSubmitting(true);
    try {
      await ack.mutateAsync({
        document_id: viewing.doc.id,
        driver_id: driver.id,
        typed_signature: signature.trim(),
      });
      toast({ title: "Acknowledgment recorded" });
      setViewing(null);
    } catch (e: any) {
      toast({ title: "Could not acknowledge", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (driverLoading || isLoading) {
    return (
      <PortalShell title="My Folder">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalShell>
    );
  }

  const visibleCategories = DOC_CATEGORIES.filter((c) => c.driverVisible);
  const needsAck = (d: EmployeeDocument) => d.requires_acknowledgment && !ackedSet.has(d.id);
  const totalNeedAck = docs.filter(needsAck).length;
  const viewingNeedsAck = viewing ? needsAck(viewing.doc) : false;

  return (
    <PortalShell
      title="My Folder"
      subtitle={
        totalNeedAck > 0
          ? `${totalNeedAck} document${totalNeedAck > 1 ? "s" : ""} awaiting your acknowledgment`
          : "Your documents"
      }
    >
      {docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No documents in your folder yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleCategories.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            if (items.length === 0) return null;
            const pending = items.filter(needsAck).length;
            const Icon = cat.icon;
            return (
              <Collapsible key={cat.id} defaultOpen={pending > 0}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">{cat.label}</span>
                    <Badge variant="outline" className="text-xs">{items.length}</Badge>
                    {pending > 0 && (
                      <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                        {pending} pending
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {items.map((doc) => {
                    const pendingAck = needsAck(doc);
                    const isDisciplinary = doc.doc_category === "disciplinary";
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "rounded-lg border p-4 flex items-start justify-between gap-4",
                          isDisciplinary
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border bg-card",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isDisciplinary && <Flag className="h-4 w-4 text-amber-500" />}
                            <div className="font-semibold truncate">{doc.title}</div>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                            {doc.effective_date && <span>Effective {doc.effective_date}</span>}
                            <span>{formatFileSize(doc.file_size_bytes)}</span>
                            {ackedSet.has(doc.id) && (
                              <span className="inline-flex items-center gap-1 text-emerald-500">
                                <ShieldCheck className="h-3 w-3" /> Acknowledged
                              </span>
                            )}
                          </div>
                          {pendingAck && (
                            <div className="mt-2 text-sm rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2">
                              Please review and acknowledge this document.
                            </div>
                          )}
                        </div>
                        <Button onClick={() => handleOpen(doc)} className="gap-2 shrink-0">
                          <Eye className="h-4 w-4" /> View
                        </Button>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewing?.doc.title}</DialogTitle>
            {viewing?.doc.description && (
              <DialogDescription>{viewing.doc.description}</DialogDescription>
            )}
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="rounded-md overflow-hidden border border-border bg-muted/30 h-[60vh]">
                {viewing.doc.mime_type?.startsWith("image/") ? (
                  <img src={viewing.url} alt={viewing.doc.title} className="w-full h-full object-contain" />
                ) : (
                  <iframe src={viewing.url} title={viewing.doc.title} className="w-full h-full" />
                )}
              </div>
              {viewingNeedsAck && (
                <div className="border-2 border-amber-500/40 bg-amber-500/5 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold">Acknowledgment required</div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                      className="mt-1"
                    />
                    <span className="text-sm">I have read and understand this document.</span>
                  </label>
                  <div className="space-y-1">
                    <Label htmlFor="sig">Type your full legal name to sign</Label>
                    <Input
                      id="sig"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Full name"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {viewingNeedsAck ? (
              <>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                <Button
                  onClick={handleAcknowledge}
                  disabled={!confirmed || signature.trim().length < 2 || submitting}
                >
                  {submitting ? "Submitting…" : "Acknowledge"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setViewing(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
