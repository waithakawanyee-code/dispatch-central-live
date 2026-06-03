import { useNavigate } from "react-router-dom";
import { Inbox, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  usePendingChangeRequestCount,
  useChangeRequestsRealtime,
} from "@/hooks/useProfileChangeRequests";

export function ProfileApprovalsWidget() {
  const navigate = useNavigate();
  useChangeRequestsRealtime();
  const { data: count = 0 } = usePendingChangeRequestCount();

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/admin/approvals")}
      className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Inbox className="h-5 w-5 text-amber-500" />
        <div className="text-sm">
          <span className="font-semibold">Profile & Document Approvals</span>
          <span className="text-muted-foreground ml-2">awaiting review</span>
        </div>
        <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">{count}</Badge>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
