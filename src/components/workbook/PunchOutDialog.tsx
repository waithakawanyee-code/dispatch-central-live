import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: Array<{ id: string; name: string; is_active: boolean; status: string; vehicle?: string | null }>;
  punchOutDriver: { id: string; name: string } | null;
  onPunchOutDriverChange: (driver: { id: string; name: string } | null) => void;
  punchOutTime: string;
  onPunchOutTimeChange: (v: string) => void;
  punchOutTabStage: 1 | 2;
  onPunchOutTabStageChange: (stage: 1 | 2) => void;
  onConfirm: () => void;
}

export function PunchOutDialog({
  open,
  onOpenChange,
  drivers,
  punchOutDriver,
  onPunchOutDriverChange,
  punchOutTime,
  onPunchOutTimeChange,
  punchOutTabStage,
  onPunchOutTabStageChange,
  onConfirm,
}: Props) {
  const punchOutDriverRef = useRef<HTMLButtonElement>(null);
  const punchOutTimeRef = useRef<HTMLInputElement>(null);
  const punchOutButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        onPunchOutDriverChange(null);
        onPunchOutTabStageChange(1);
      }
    }}>
      <DialogContent
        className="sm:max-w-[350px]"
        onOpenAutoFocus={e => {
          e.preventDefault();
          onPunchOutTabStageChange(1);
          // If driver is pre-selected, focus time; otherwise focus driver
          setTimeout(() => {
            if (punchOutDriver) {
              punchOutTimeRef.current?.focus();
              punchOutTimeRef.current?.select();
            } else {
              punchOutDriverRef.current?.focus();
            }
          }, 0);
        }}
        onKeyDown={e => {
          const hasDriver = !!punchOutDriver;
          const activeEl = document.activeElement;

          // Handle Tab key navigation
          if (e.key === "Tab") {
            // Stage 1: Minimal loop
            if (punchOutTabStage === 1) {
              if (!e.shiftKey) {
                // Forward Tab
                if (activeEl === punchOutButtonRef.current) {
                  // Tab past Punch Out → Switch to Stage 2, go to Driver
                  e.preventDefault();
                  onPunchOutTabStageChange(2);
                  punchOutDriverRef.current?.focus();
                } else if (activeEl === punchOutTimeRef.current) {
                  // Time → Punch Out
                  e.preventDefault();
                  punchOutButtonRef.current?.focus();
                } else if (activeEl === punchOutDriverRef.current && !hasDriver) {
                  // Driver → Time (only if driver field is in the loop initially)
                  e.preventDefault();
                  punchOutTimeRef.current?.focus();
                  punchOutTimeRef.current?.select();
                }
              } else {
                // Shift+Tab in Stage 1
                if (activeEl === punchOutTimeRef.current) {
                  if (hasDriver) {
                    // If driver pre-selected, Time is first field - wrap to Punch Out
                    e.preventDefault();
                    punchOutButtonRef.current?.focus();
                  } else {
                    // Driver not pre-selected, go to Driver
                    e.preventDefault();
                    punchOutDriverRef.current?.focus();
                  }
                } else if (activeEl === punchOutDriverRef.current) {
                  // Driver is first field - wrap to Punch Out
                  e.preventDefault();
                  punchOutButtonRef.current?.focus();
                } else if (activeEl === punchOutButtonRef.current) {
                  // Punch Out → Time
                  e.preventDefault();
                  punchOutTimeRef.current?.focus();
                  punchOutTimeRef.current?.select();
                }
              }
            } else {
              // Stage 2: Full cycle (Driver → Time → Punch Out → Driver)
              if (!e.shiftKey) {
                // Forward Tab in Stage 2
                if (activeEl === punchOutButtonRef.current) {
                  // Punch Out → Driver (wrap)
                  e.preventDefault();
                  punchOutDriverRef.current?.focus();
                } else if (activeEl === punchOutDriverRef.current) {
                  // Driver → Time
                  e.preventDefault();
                  punchOutTimeRef.current?.focus();
                  punchOutTimeRef.current?.select();
                } else if (activeEl === punchOutTimeRef.current) {
                  // Time → Punch Out
                  e.preventDefault();
                  punchOutButtonRef.current?.focus();
                }
              } else {
                // Shift+Tab in Stage 2 (reverse)
                if (activeEl === punchOutDriverRef.current) {
                  // Driver → Punch Out (wrap backwards)
                  e.preventDefault();
                  punchOutButtonRef.current?.focus();
                } else if (activeEl === punchOutTimeRef.current) {
                  // Time → Driver
                  e.preventDefault();
                  punchOutDriverRef.current?.focus();
                } else if (activeEl === punchOutButtonRef.current) {
                  // Punch Out → Time
                  e.preventDefault();
                  punchOutTimeRef.current?.focus();
                  punchOutTimeRef.current?.select();
                }
              }
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Punch Out Driver</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="punch-out-driver">Driver</Label>
            <Select value={punchOutDriver?.id || ""} onValueChange={val => {
              const driver = drivers.find(d => d.id === val);
              if (driver) {
                onPunchOutDriverChange({
                  id: driver.id,
                  name: driver.name
                });
                // Reset to Stage 1 when driver changes
                onPunchOutTabStageChange(1);
                // Focus time after driver selection
                setTimeout(() => {
                  punchOutTimeRef.current?.focus();
                  punchOutTimeRef.current?.select();
                }, 0);
              }
            }}>
              <SelectTrigger id="punch-out-driver" ref={punchOutDriverRef} tabIndex={punchOutTabStage === 2 || !punchOutDriver ? 0 : -1}>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.is_active).map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                    {!["working", "on-route"].includes(driver.status) && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({driver.status})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Display current vehicle as read-only */}
          {punchOutDriver && (() => {
            const driver = drivers.find(d => d.id === punchOutDriver.id);
            const vehicleUnit = driver?.vehicle;
            return vehicleUnit ? (
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-xs">Vehicle</Label>
                <div className="text-sm font-medium px-3 py-2 rounded-md bg-muted/50">
                  {vehicleUnit}
                </div>
              </div>
            ) : null;
          })()}
          <div className="grid gap-2">
            <Label htmlFor="punch-out-time">Time</Label>
            <TimeInput
              id="punch-out-time"
              ref={punchOutTimeRef}
              value={punchOutTime}
              onChange={onPunchOutTimeChange}
              onEnterSubmit={onConfirm}
              placeholder="e.g. 530, 5:30pm, 17:30"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} tabIndex={-1}>
            Cancel
          </Button>
          <Button ref={punchOutButtonRef} onClick={onConfirm} disabled={!punchOutDriver}>
            Punch Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
