import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PortalShell } from "@/components/tablet/PortalShell";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "fmla", label: "FMLA" },
] as const;

interface TimeOffRow {
  id: string;
  time_off_type: string;
  start_date: string;
  end_date: string;
  hours_requested: number | null;
  notes: string | null;
  status: string;
  decided_at: string | null;
  decision_note: string | null;
  submitted_at: string;
}

function statusInfo(row: TimeOffRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!row.decided_at) return { label: "Pending", variant: "outline" };
  if (row.status === "approved") return { label: "Approved", variant: "default" };
  if (row.status === "denied") return { label: "Denied", variant: "destructive" };
  return { label: row.status, variant: "secondary" };
}

function PortalTimeOffInner() {
  const { driver, loading: driverLoading } = useCurrentDriver();
  const [rows, setRows] = useState<TimeOffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<string>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hours, setHours] = useState<string>("");
  const [notes, setNotes] = useState("");

  const autoHours = useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      return days.filter((d) => !isWeekend(d)).length * 8;
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setHours(autoHours.toString());
  }, [autoHours]);

  const refetch = async (driverId: string) => {
    const { data } = await supabase
      .from("driver_time_off")
      .select("id, time_off_type, start_date, end_date, hours_requested, notes, status, decided_at, decision_note, submitted_at")
      .eq("driver_id", driverId);
    const sorted = (data ?? []).sort((a, b) => {
      const ap = a.decided_at ? 1 : 0;
      const bp = b.decided_at ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return b.start_date.localeCompare(a.start_date);
    });
    setRows(sorted as TimeOffRow[]);
  };

  useEffect(() => {
    if (!driver?.id) return;
    refetch(driver.id).finally(() => setLoading(false));
  }, [driver?.id]);

  const reset = () => {
    setType("vacation");
    setStartDate("");
    setEndDate("");
    setHours("");
    setNotes("");
  };

  const submit = async () => {
    if (!driver?.id) return;
    if (!startDate || !endDate) {
      toast.error("Pick start and end dates");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("driver_time_off").insert({
      driver_id: driver.id,
      driver_name: driver.name,
      time_off_type: type as any,
      start_date: startDate,
      end_date: endDate,
      hours_requested: hours ? Number(hours) : null,
      notes: notes.trim() || null,
      status: "pending" as any,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request submitted");
    setOpen(false);
    reset();
    refetch(driver.id);
  };

  const cancel = async (id: string) => {
    if (!driver?.id) return;
    const { error } = await supabase.from("driver_time_off").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request cancelled");
    refetch(driver.id);
  };

  const pendingCount = rows.filter((r) => !r.decided_at).length;

  if (driverLoading || loading) {
    return (
      <PortalShell title="Time Off">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Time Off" subtitle="Request time off and check your status.">
      <div className="flex items-center justify-between mb-6">
        <div className="text-base text-muted-foreground">
          {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}
        </div>
        <Button size="lg" className="h-14 gap-2 text-base" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" />
          Request Time Off
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No time off requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const s = statusInfo(r);
            const undecided = !r.decided_at;
            return (
              <div
                key={r.id}
                className="rounded-xl border-2 border-border bg-card p-5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-lg font-bold capitalize">{r.time_off_type}</div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <div className="text-base">
                    {format(parseISO(r.start_date), "MMM d, yyyy")} →{" "}
                    {format(parseISO(r.end_date), "MMM d, yyyy")}
                  </div>
                  {r.hours_requested != null && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {r.hours_requested} hours
                    </div>
                  )}
                  {r.notes && (
                    <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {r.notes}
                    </div>
                  )}
                  {r.decision_note && r.status === "denied" && (
                    <div className="mt-3 rounded-md bg-destructive/10 text-destructive p-2 text-sm">
                      Denied: {r.decision_note}
                    </div>
                  )}
                </div>
                {undecided && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => cancel(r.id)}
                    className="h-12 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            <div>
              <Label>Hours requested</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-12"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Auto-calculated as weekdays × 8. Edit if different.
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

export default function PortalTimeOff() {
  return (
    <ProtectedRoute allowedRoles={["DRIVER"]}>
      <PortalTimeOffInner />
    </ProtectedRoute>
  );
}
