import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  ChevronDown,
  Download,
  Archive,
  EyeOff,
  Eye,
  Loader2,
  Flag,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useEmployeeDocuments,
  useDocumentAcks,
  useArchiveDocument,
  getSignedDocUrl,
} from "@/hooks/useEmployeeDocuments";
import {
  DOC_CATEGORIES,
  formatFileSize,
  type EmployeeDocument,
} from "@/lib/employeeDocuments";
import { UploadDocumentDialog } from "./UploadDocumentDialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  driverId: string;
  driverName: string;
}

export function DriverFolderTab({ driverId, driverName }: Props) {
  const { data: docs = [], isLoading } = useEmployeeDocuments(driverId, { includeArchived: true });
  const { data: acks = [] } = useDocumentAcks(driverId);
  const archive = useArchiveDocument();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);

  const ackByDoc = useMemo(() => {
    const m = new Map(acks.map((a) => [a.document_id, a]));
    return m;
  }, [acks]);

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeDocument[]>();
    for (const d of docs) {
      if (d.archived_at) continue;
      if (!map.has(d.doc_category)) map.set(d.doc_category, []);
      map.get(d.doc_category)!.push(d);
    }
    return map;
  }, [docs]);

  const open = async (doc: EmployeeDocument) => {
    try {
      const url = await getSignedDocUrl(doc.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Could not open", description: e.message, variant: "destructive" });
    }
  };

  const doArchive = async (doc: EmployeeDocument) => {
    if (!confirm(`Archive "${doc.title}"? It will be hidden from the driver.`)) return;
    try {
      await archive.mutateAsync(doc.id);
      toast({ title: "Document archived" });
    } catch (e: any) {
      toast({ title: "Archive failed", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {docs.filter((d) => !d.archived_at).length} active document
          {docs.filter((d) => !d.archived_at).length === 1 ? "" : "s"}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload Document
        </Button>
      </div>

      {docs.filter((d) => !d.archived_at).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          No documents yet. Click "Upload Document" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {DOC_CATEGORIES.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            if (items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <Collapsible key={cat.id} defaultOpen={cat.id === "disciplinary"}>
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-secondary/40">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{cat.label}</span>
                    <Badge variant="outline" className="text-xs">{items.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {items.map((doc) => {
                    const ack = ackByDoc.get(doc.id);
                    const isDisciplinary = doc.doc_category === "disciplinary";
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "rounded-md border p-3 flex items-start justify-between gap-3",
                          isDisciplinary ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isDisciplinary && <Flag className="h-3.5 w-3.5 text-amber-500" />}
                            <span className="font-medium truncate">{doc.title}</span>
                            {!doc.visible_to_driver && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <EyeOff className="h-3 w-3" /> Internal
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{doc.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                            <span>{doc.file_name}</span>
                            <span>{formatFileSize(doc.file_size_bytes)}</span>
                            {doc.effective_date && <span>Effective {doc.effective_date}</span>}
                            <span>Uploaded {format(new Date(doc.uploaded_at), "MMM d, yyyy")}</span>
                          </div>
                          {doc.requires_acknowledgment && (
                            <div className="mt-1.5 text-xs">
                              {ack ? (
                                <span className="inline-flex items-center gap-1 text-emerald-500">
                                  <ShieldCheck className="h-3 w-3" />
                                  Acknowledged {format(new Date(ack.acknowledged_at), "yyyy-MM-dd HH:mm")} — {ack.typed_signature}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-400">
                                  <Clock className="h-3 w-3" />
                                  Pending since {format(new Date(doc.uploaded_at), "yyyy-MM-dd")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => open(doc)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => open(doc)} title="Download">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => doArchive(doc)} title="Archive">
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <UploadDocumentDialog
        driverId={driverId}
        driverName={driverName}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}
