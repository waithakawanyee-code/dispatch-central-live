import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { format, parseISO, differenceInMinutes } from "date-fns";
import type { Shift } from "@/hooks/useShifts";

interface ShiftPunchOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  onConfirm: (punchTime: string) => void;
}

export function ShiftPunchOutDialog({
  open,
  onOpenChange,
  shift,
  onConfirm,
}: ShiftPunchOutDialogProps) {
  const [punchTime, setPunchTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && shift) {
      const now = new Date();
      setPunchTime(format(now, "HH:mm"));
      setError(null);
    }
  }, [open, shift]);

  if (!shift) return null;

  const punchInTime = parseISO(shift.punch_in_at);
  const punchInMinutes = punchInTime.getHours() * 60 + punchInTime.getMinutes();

  const handleConfirm = () => {
    // Validate punch out is after punch in
    const [hours, minutes] = punchTime.split(":").map(Number);
    const punchOutMinutes = hours * 60 + minutes;

    if (punchOutMinutes <= punchInMinutes) {
      setError(`Punch out must be after punch in (${format(punchInTime, "h:mm a")})`);
      return;
    }

    setError(null);
    onConfirm(punchTime);
  };

  // Calculate elapsed time for display
  const calculateElapsed = () => {
    if (!punchTime) return null;
    const [hours, minutes] = punchTime.split(":").map(Number);
    const punchOutDate = new Date(punchInTime);
    punchOutDate.setHours(hours, minutes, 0, 0);
    
    const totalMinutes = differenceInMinutes(punchOutDate, punchInTime);
    if (totalMinutes <= 0) return null;
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const elapsed = calculateElapsed();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Punch Out: {shift.driver_name}</DialogTitle>
          <DialogDescription>
            Punched in at {format(punchInTime, "h:mm a")}
            {shift.vehicle_unit && ` • Vehicle: ${shift.vehicle_unit}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="punch-out-time">Punch Out Time</Label>
            <TimeInput
              id="punch-out-time"
              value={punchTime}
              onChange={(val) => {
                setPunchTime(val);
                setError(null);
              }}
              className="w-full"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {elapsed && (
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <span className="text-sm text-muted-foreground">Total shift time: </span>
              <span className="font-mono font-medium">{elapsed}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Punch Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
