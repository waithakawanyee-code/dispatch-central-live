import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import { Switch } from "@/components/ui/switch";
import { Moon } from "lucide-react";
import { format, addDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

interface ShiftPunchInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  currentVehicle?: string | null;
  defaultVehicle?: string | null;
  vehicles: VehicleRow[];
  selectedWorkday: Date;
  onConfirm: (punchTime: string, vehicle: string | undefined, nextDayOverride: boolean) => void;
}

export function ShiftPunchInDialog({
  open,
  onOpenChange,
  driverName,
  currentVehicle,
  defaultVehicle,
  vehicles,
  selectedWorkday,
  onConfirm,
}: ShiftPunchInDialogProps) {
  const [punchTime, setPunchTime] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("__none__");
  const [nextDayOverride, setNextDayOverride] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Check if time is after 10pm
  const isAfter10PM = punchTime && parseInt(punchTime.split(":")[0]) >= 22;
  const nextDay = addDays(selectedWorkday, 1);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      setPunchTime(format(now, "HH:mm"));
      setSelectedVehicle(currentVehicle || defaultVehicle || "__none__");
      setNextDayOverride(false);

      // Focus time input after dialog animation
      setTimeout(() => {
        timeInputRef.current?.focus();
        timeInputRef.current?.select();
      }, 50);
    }
  }, [open, currentVehicle, defaultVehicle]);

  const handleConfirm = () => {
    const vehicle = selectedVehicle === "__none__" ? undefined : selectedVehicle;
    onConfirm(punchTime, vehicle, nextDayOverride);
  };

  const activeVehicles = vehicles.filter(v => v.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Punch In: {driverName}</DialogTitle>
          <DialogDescription>
            Record shift start time and vehicle assignment
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Punch time */}
          <div className="grid gap-2">
            <Label htmlFor="punch-time">Punch In Time</Label>
            <TimeInput
              ref={timeInputRef}
              id="punch-time"
              value={punchTime}
              onChange={setPunchTime}
              placeholder="e.g. 730, 9:00a, 14:30"
              onEnterSubmit={handleConfirm}
            />
          </div>

          {/* Late night override toggle */}
          {isAfter10PM && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <Moon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="next-day-override" className="text-sm font-medium">
                    Count for next day's shift
                  </Label>
                  <Switch
                    id="next-day-override"
                    checked={nextDayOverride}
                    onCheckedChange={setNextDayOverride}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {nextDayOverride ? (
                    <>This shift will be recorded for <strong>{format(nextDay, "EEEE, MMM d")}</strong></>
                  ) : (
                    <>This shift will be recorded for <strong>{format(selectedWorkday, "EEEE, MMM d")}</strong></>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Vehicle selection using VehicleCombobox */}
          <div className="grid gap-2">
            <Label>Vehicle</Label>
            <VehicleCombobox
              vehicles={activeVehicles}
              value={selectedVehicle}
              onValueChange={setSelectedVehicle}
              placeholder="Select vehicle"
              includeNone
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} tabIndex={-1}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Punch In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
