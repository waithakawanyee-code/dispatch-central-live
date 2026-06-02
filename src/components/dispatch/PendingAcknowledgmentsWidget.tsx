import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { usePendingAcknowledgments } from "@/hooks/useEmployeeDocuments";
import { categoryMeta } from "@/lib/employeeDocuments";
import { useUserRole } from "@/hooks/useUserRole";

export function PendingAcknowledgmentsWidget() {
  const { isAdmin } = useUserRole();
  const { data: pending = [], isLoading } = usePendingAcknowledgments();

  if (!isAdmin) return null;
  if (isLoading || pending.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-amber-400">
        <ClipboardCheck className="h-4 w-4" />
        Pending Driver Acknowledgments ({pending.length})
      </div>
      <div className="space-y-1">
        {pending.map((p) => {
          const meta = categoryMeta(p.doc_category);
          return (
            <Link
              key={p.id}
              to={`/admin/driver/${p.driver_id}`}
              className="flex items-center justify-between gap-3 text-sm rounded px-2 py-1.5 hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <meta.icon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-medium truncate">{p.driver_name}</span>
                <span className="text-muted-foreground truncate">— {p.title}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <span>pending {formatDistanceToNow(new Date(p.uploaded_at))}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
