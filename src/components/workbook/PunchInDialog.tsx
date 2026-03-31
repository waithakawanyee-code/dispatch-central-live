import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import { VehicleCombobox } from "@/components/VehicleCombobox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: Array<{ id: string; name: string; is_active: boolean; status: string }>;
  vehicles: Array<{ id: string; unit: string; status: string }>;
  punchInDriver: { id: string; name: string } | null;
  onPunchInDriverChange: (driver: { id: string; name: string } | null) => void;
  punchInVehicle: string;
  onPunchInVehicleChange: (v: string) => void;
  punchInTime: string;
  onPunchInTimeChange: (v: string) => void;
  punchInTabStage: 1 | 2;
  onPunchInTabStageChange: (stage: 1 | 2) => void;
  getDriverDefaultVehicle: (driverId: string) => string;
  onConfirm: () => void;
}

export function PunchInDialog({
  open,
  onOpenChange,
  drivers,
  vehicles,
  punchInDriver,
  onPunchInDriverChange,
  punchInVehicle,
  onPunchInVehicleChange,
  punchInTime,
  onPunchInTimeChange,
  punchInTabStage,
  onPunchInTabStageChange,
  getDriverDefaultVehicle,
  onConfirm,
}: Props) {
  const punchInDriverRef = useRef<HTMLButtonElement>(null);
  const punchInVehicleRef = useRef<HTMLButtonElement>(null);
  const punchInTimeRef = useRef<HTMLInputElement>(null);
  const punchInButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={open => {
      onOpenChange(open);
      if (!open) {
        onPunchInDriverChange(null);
        onPunchInTabStageChange(1);
      }
    }}>
      <DialogContent
        className="sm:max-w-[350px]"
        onOpenAutoFocus={e => {
          e.preventDefault();
          onPunchInTabStageChange(1);
          // Smart focus: if vehicle is already assigned, skip to time
          setTimeout(() => {
            const hasVehicle = punchInVehicle && punchInVehicle !== "__none__";
            if (hasVehicle) {
              punchInTimeRef.current?.focus();
              punchInTimeRef.current?.select();
            } else {
              punchInVehicleRef.current?.focus();
            }
          }, 0);
        }}
        onKeyDown={e => {
          const hasVehicle = punchInVehicle && punchInVehicle !== "__none__";
          const activeEl = document.activeElement;

          // Handle Tab key navigation
          if (e.key === "Tab") {
            // Stage 1: Minimal loop
            if (punchInTabStage === 1) {
              if (!e.shiftKey) {
                // Forward Tab
                if (activeEl === punchInButtonRef.current) {
                  // Tab past Punch In → Switch to Stage 2, go to Driver
                  e.preventDefault();
                  onPunchInTabStageChange(2);
                  punchInDriverRef.current?.focus();
                } else if (activeEl === punchInTimeRef.current) {
                  // Time → Punch In (skip Driver/Vehicle in Stage 1)
                  e.preventDefault();
                  punchInButtonRef.current?.focus();
                } else if (activeEl === punchInVehicleRef.current && !hasVehicle) {
                  // Vehicle → Time (only if vehicle field is in the loop)
                  e.preventDefault();
                  punchInTimeRef.current?.focus();
                  punchInTimeRef.current?.select();
                }
              } else {
                // Shift+Tab in Stage 1
                if (activeEl === punchInTimeRef.current) {
                  if (hasVehicle) {
                    // If vehicle assigned, Time is first field - wrap to Punch In
                    e.preventDefault();
                    punchInButtonRef.current?.focus();
                  } else {
                    // Vehicle not assigned, go to Vehicle
                    e.preventDefault();
                    punchInVehicleRef.current?.focus();
                  }
                } else if (activeEl === punchInVehicleRef.current) {
                  // Vehicle is first field in Stage 1 when no vehicle - wrap to Punch In
                  e.preventDefault();
                  punchInButtonRef.current?.focus();
                } else if (activeEl === punchInButtonRef.current) {
                  // Punch In → Time
                  e.preventDefault();
                  punchInTimeRef.current?.focus();
                  punchInTimeRef.current?.select();
                }
              }
            } else {
              // Stage 2: Full cycle (Driver → Vehicle → Time → Punch In → Driver)
              if (!e.shiftKey) {
                // Forward Tab in Stage 2
                if (activeEl === punchInButtonRef.current) {
                  // Punch In → Driver (wrap)
                  e.preventDefault();
                  punchInDriverRef.current?.focus();
                } else if (activeEl === punchInDriverRef.current) {
                  // Driver → Vehicle
                  e.preventDefault();
                  punchInVehicleRef.current?.focus();
                } else if (activeEl === punchInVehicleRef.current) {
                  // Vehicle → Time
                  e.preventDefault();
                  punchInTimeRef.current?.focus();
                  punchInTimeRef.current?.select();
                } else if (activeEl === punchInTimeRef.current) {
                  // Time → Punch In
                  e.preventDefault();
                  punchInButtonRef.current?.focus();
                }
              } else {
                // Shift+Tab in Stage 2 (reverse)
                if (activeEl === punchInDriverRef.current) {
                  // Driver → Punch In (wrap backwards)
                  e.preventDefault();
                  punchInButtonRef.current?.focus();
                } else if (activeEl === punchInVehicleRef.current) {
                  // Vehicle → Driver
                  e.preventDefault();
                  punchInDriverRef.current?.focus();
                } else if (activeEl === punchInTimeRef.current) {
                  // Time → Vehicle
                  e.preventDefault();
                  punchInVehicleRef.current?.focus();
                } else if (activeEl === punchInButtonRef.current) {
                  // Punch In → Time
                  e.preventDefault();
                  punchInTimeRef.current?.focus();
                  punchInTimeRef.current?.select();
                }
              }
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Punch In Driver</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="punch-in-driver">Driver</Label>
            <Select value={punchInDriver?.id || ""} onValueChange={val => {
              const driver = drivers.find(d => d.id === val);
              if (driver) {
                onPunchInDriverChange({
                  id: driver.id,
                  name: driver.name
                });
                const newVehicle = getDriverDefaultVehicle(driver.id);
                onPunchInVehicleChange(newVehicle);
                // Reset to Stage 1 when driver changes
                onPunchInTabStageChange(1);
                // Re-focus based on new vehicle state
                setTimeout(() => {
                  if (newVehicle && newVehicle !== "__none__") {
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  } else {
                    punchInVehicleRef.current?.focus();
                  }
                }, 0);
              }
            }}>
              <SelectTrigger id="punch-in-driver" ref={punchInDriverRef} tabIndex={punchInTabStage === 2 ? 0 : -1}>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.is_active).map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.status !== "confirmed" && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({driver.status})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label
              htmlFor="punch-in-vehicle"
              className={punchInDriver && drivers.find(d => d.id === punchInDriver.id)?.status === "unconfirmed" ? "text-amber-400 font-medium" : ""}
            >
              Vehicle {punchInDriver && drivers.find(d => d.id === punchInDriver.id)?.status === "unconfirmed" && (
                <span className="text-amber-400 text-xs ml-1">(required)</span>
              )}
            </Label>
            <VehicleCombobox
              ref={punchInVehicleRef}
              vehicles={vehicles.filter(v => v.status === "active")}
              value={punchInVehicle}
              onValueChange={(val) => {
                onPunchInVehicleChange(val);
                // After vehicle selection, move focus to time
                setTimeout(() => {
                  punchInTimeRef.current?.focus();
                  punchInTimeRef.current?.select();
                }, 0);
              }}
              placeholder="Select vehicle"
              includeNone
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="punch-in-time">Time</Label>
            <TimeInput
              id="punch-in-time"
              ref={punchInTimeRef}
              value={punchInTime}
              onChange={onPunchInTimeChange}
              onEnterSubmit={onConfirm}
              placeholder="e.g. 930, 9:30am, 21:30"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} tabIndex={-1}>
            Cancel
          </Button>
          <Button ref={punchInButtonRef} onClick={onConfirm} disabled={!punchInDriver}>
            Punch In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
