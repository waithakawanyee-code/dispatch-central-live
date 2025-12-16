import { User, Truck, ArrowRight } from "lucide-react";
import { useStatusHistory } from "@/hooks/useStatusHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export function HistoryLog() {
  const { history, loading } = useStatusHistory(100);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Status Change History</h2>
        <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
          {history.length} entries
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[140px_80px_1fr_1fr_1fr] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Time</span>
          <span>Type</span>
          <span>Name</span>
          <span>Field</span>
          <span>Change</span>
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No status changes recorded yet. Changes will appear here in real-time.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[140px_80px_1fr_1fr_1fr] gap-4 border-b border-border px-4 py-3 text-sm last:border-0"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(entry.changed_at)}
                </span>
                <div className="flex items-center gap-1.5">
                  {entry.entity_type === "driver" ? (
                    <User className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="text-xs capitalize">{entry.entity_type}</span>
                </div>
                <span className="font-medium truncate" title={entry.entity_name}>
                  {entry.entity_name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatFieldName(entry.field_changed)}
                </span>
                <div className="flex items-center gap-2">
                  {entry.old_value && (
                    <>
                      <StatusBadge status={entry.old_value as any} size="sm" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <StatusBadge status={entry.new_value as any} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
