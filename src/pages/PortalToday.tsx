import { useEffect, useState } from "react";
import { Flag, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PortalShell } from "@/components/tablet/PortalShell";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { format } from "date-fns";

const CHIPS = [
  { id: "call_out", label: "Calling out (won't be in)", isCallOut: true, color: "destructive" },
  { id: "late", label: "Running late", isCallOut: false, color: "warning" },
  { id: "leave_early", label: "Need to leave early", isCallOut: false, color: "warning" },
  { id: "constraint", label: "Have a constraint", isCallOut: false, color: "warning" },
  { id: "other", label: "Other", isCallOut: false, color: "neutral" },
] as const;

interface CallOutRow {
  id: string;
  driver_id: string;
  driver_name: string;
  call_out_date: string;
  note: string | null;
  is_call_out: boolean;
  created_at: string;
}

function todayNyDate(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function PortalTodayInner() {
  const { driver, loading: driverLoading } = useCurrentDriver();
  const [existing, setExisting] = useState<CallOutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [chip, setChip] = useState<string>("call_out");
  const [note, setNote] = useState("");

  const today = todayNyDate();

  const refetch = async (driverId: string) => {
    const { data } = await supabase
      .from("call_outs")
      .select("*")
      .eq("driver_id", driverId)
      .eq("call_out_date", today)
      .maybeSingle();
    setExisting((data as CallOutRow | null) ?? null);
  };

  useEffect(() => {
    if (!driver?.id) return;
    refetch(driver.id).finally(() => setLoading(false));
  }, [driver?.id]);

  const openModal = () => {
    if (existing) {
      setChip(existing.is_call_out ? "call_out" : "constraint");
      setNote(existing.note ?? "");
    } else {
      setChip("call_out");
      setNote("");
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!driver?.id) return;
    if (!note.trim()) {
      toast.error("Add a short note");
      return;
    }
    const selected = CHIPS.find((c) => c.id === chip)!;
    setSubmitting(true);
    if (existing) {
      const { error } = await supabase
        .from("call_outs")
        .update({
          is_call_out: selected.isCallOut,
          note: note.trim(),
        })
        .eq("id", existing.id);
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("call_outs").insert({
        driver_id: driver.id,
        driver_name: driver.name,
        call_out_date: today,
        is_call_out: selected.isCallOut,
        note: note.trim(),
      });
      setSubmitting(false);
      if (error) return toast.error(error.message);
      toast.success("Dispatch has been notified");
    }
    setOpen(false);
    refetch(driver.id);
  };

  const withdraw = async () => {
    if (!existing) return;
    const { error } = await supabase.from("call_outs").delete().eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success("Withdrawn");
    setExisting(null);
    setOpen(false);
  };

  if (driverLoading || loading) {
    return (
      <PortalShell title="Flag Something for Today">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="Flag Something for Today"
      subtitle="Let dispatch know if anything affects your shift today."
    >
      {existing ? (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div className="text-lg font-bold">Dispatch has been notified</div>
          </div>
          <div className="text-base mb-2">
            <span className="font-semibold">
              {existing.is_call_out ? "Calling out" : "Constraint / Note"}:
            </span>{" "}
            {existing.note}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            Submitted {format(new Date(existing.created_at), "HH:mm")}
          </div>
        </div>
      ) : null}

      <Button
        size="lg"
        className="w-full h-20 text-xl gap-3"
        variant={existing ? "outline" : "default"}
        onClick={openModal}
      >
        <Flag className="h-7 w-7" />
        {existing ? "Update or Withdraw" : "I need to flag something for today"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{existing ? "Update today's flag" : "Flag for today"}</DialogTitle>
            <DialogDescription>Choose what's going on and add a quick note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChip(c.id)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-left text-base transition-colors",
                    chip === c.id
                      ? c.isCallOut
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="e.g. Car trouble, will be 30 min late"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {note.length}/200
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {existing && (
              <Button variant="destructive" size="lg" onClick={withdraw} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Withdraw
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {existing ? "Update" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

export default function PortalToday() {
  return (
    <ProtectedRoute allowedRoles={["DRIVER"]}>
      <PortalTodayInner />
    </ProtectedRoute>
  );
}
