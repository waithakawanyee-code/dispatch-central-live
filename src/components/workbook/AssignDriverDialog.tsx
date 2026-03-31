import { useRef } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import { VehicleCombobox } from "@/components/VehicleCombobox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  isFutureDate: boolean;
  drivers: Array<{ id: string; name: string; is_active: boolean; default_vehicle?: string | null }>;
  vehicles: Array<{ id: string; unit: string; status: string }>;
  assigningDriver: { id: string; name: string } | null;
  onAssigningDriverChange: (driver: { id: string; name: string } | null) => void;
  assignReportTime: string;
  onAssignReportTimeChange: (v: string) => void;
  assignVehicle: string;
  onAssignVehicleChange: (v: string) => void;
  onConfirm: () => void;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  selectedDate,
  isFutureDate,
  drivers,
  vehicles,
  assigningDriver,
  onAssigningDriverChange,
  assignReportTime,
  onAssignReportTimeChange,
  assignVehicle,
  onAssignVehicleChange,
  onConfirm,
}: Props) {
  const assignButtonRef = useRef<HTMLButtonElement>(null);
  const assignReportTimeRef = useRef<HTMLInputElement>(null);
  const assignDriverSelectRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]" onOpenAutoFocus={e => {
        e.preventDefault();
        setTimeout(() => {
          assignReportTimeRef.current?.focus();
        }, 50);
      }}>
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Assign for {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
        <div className="grid gap-4 py-4">
          {/* Driver - First visually, but skipped in first tab cycle */}
          <div className="grid gap-2">
            <Label htmlFor="assign-driver">Driver</Label>
            <Select value={assigningDriver?.id || ""} onValueChange={val => {
              const driver = drivers.find(d => d.id === val);
              if (driver) {
                const defaultVehicle = (driver as any)?.default_vehicle;
                onAssigningDriverChange({
                  id: driver.id,
                  name: driver.name
                });
                onAssignVehicleChange(defaultVehicle || "__none__");
              }
            }}>
              <SelectTrigger ref={assignDriverSelectRef} id="assign-driver" tabIndex={-1}>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {drivers.filter(d => d.is_active).sort((a, b) => a.name.localeCompare(b.name)).map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Report Time - First in tab order (focus starts here) */}
          <div className="grid gap-2">
            <Label htmlFor="future-report-time">Report Time (optional)</Label>
            <TimeInput
              ref={assignReportTimeRef}
              id="future-report-time"
              value={assignReportTime}
              onChange={onAssignReportTimeChange}
              placeholder="HH:MM"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  assignButtonRef.current?.focus();
                }
              }}
            />
          </div>
          {/* Vehicle - Second in tab order */}
          <div className="grid gap-2">
            <Label htmlFor="future-vehicle">Vehicle (optional)</Label>
            <VehicleCombobox
              vehicles={vehicles.filter(v => v.status === "active")}
              value={assignVehicle}
              onValueChange={onAssignVehicleChange}
              placeholder="No vehicle"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} tabIndex={-1}>
            Cancel
          </Button>
          <Button
            ref={assignButtonRef}
            onClick={onConfirm}
            disabled={!assigningDriver}
            onKeyDown={e => {
              // Tab from Assign cycles to Driver field
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                assignDriverSelectRef.current?.focus();
              }
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
