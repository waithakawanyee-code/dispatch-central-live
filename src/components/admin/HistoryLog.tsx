import { User, Truck, ArrowRight } from "lucide-react";
import { useStatusHistory } from "@/hooks/useStatusHistory";
import { useDateFormat } from "@/hooks/useDateFormat";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export function HistoryLog() {
  const { history, loading } = useStatusHistory(100);
  const { formatDate } = useDateFormat();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${formatDate(date)} ${timeStr}`;
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
        <h2 className="text-lg font-bold tracking-tight">Status Change History</h2>
        <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground border border-border/50">
          {history.length} entries
        </span>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/60">
        <div className="grid grid-cols-[140px_80px_1fr_1fr_1fr] gap-4 border-b border-border/40 bg-muted/20 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Time</span>
          <span>Type</span>
          <span>Name</span>
          <span>Field</span>
          <span>Change</span>
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-12 text-center text-[11px] text-muted-foreground/60">
            No status changes recorded yet. Changes will appear here in real-time.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[140px_80px_1fr_1fr_1fr] gap-4 border-b border-border/30 px-4 py-2.5 text-sm last:border-0 hover:bg-accent/20 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground/80">
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
                <span className="text-muted-foreground/70 text-xs">
                  {formatFieldName(entry.field_changed)}
                </span>
                <div className="flex items-center gap-2">
                  {entry.old_value && (
                    <>
                      <StatusBadge status={entry.old_value as any} size="sm" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
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
