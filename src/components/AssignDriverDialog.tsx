import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import { AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  initialReportTime?: string;
  initialVehicle?: string;
  vehicles: VehicleRow[];
  drivers?: DriverRow[];
  selectedDriverId?: string;
  onConfirm: (reportTime: string | undefined, vehicle: string | undefined, driverId?: string) => void;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  driverName,
  initialReportTime = "",
  initialVehicle = "__none__",
  vehicles,
  drivers = [],
  selectedDriverId,
  onConfirm,
}: AssignDriverDialogProps) {
  const [reportTime, setReportTime] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("__none__");
  const [currentDriverId, setCurrentDriverId] = useState<string | undefined>(selectedDriverId);
  const [validationError, setValidationError] = useState("");
  const timeInputRef = useRef<HTMLInputElement>(null);
  const driverSelectRef = useRef<HTMLSelectElement>(null);
  const assignButtonRef = useRef<HTMLButtonElement>(null);
  const hasCompletedFirstCycle = useRef(false);

  // Get current driver name for display
  const currentDriverName = currentDriverId 
    ? drivers.find(d => d.id === currentDriverId)?.name || driverName
    : driverName;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReportTime(initialReportTime);
      setSelectedVehicle(initialVehicle);
      setCurrentDriverId(selectedDriverId);
      setValidationError("");
      hasCompletedFirstCycle.current = false;

      // Focus report time input after dialog animation
      setTimeout(() => {
        timeInputRef.current?.focus();
        timeInputRef.current?.select();
      }, 50);
    }
  }, [open, initialReportTime, initialVehicle, selectedDriverId]);

  const vehicleValue = selectedVehicle === "__none__" ? undefined : selectedVehicle;
  const canAssign = reportTime.trim() !== "" || vehicleValue !== undefined;

  const handleAssign = () => {
    if (!canAssign) {
      setValidationError("Set Report Time or Vehicle to assign");
      timeInputRef.current?.focus();
      return;
    }
    setValidationError("");
    onConfirm(reportTime.trim() || undefined, vehicleValue, currentDriverId);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  // Handle tab cycling: after first cycle, include Driver field
  const handleAssignButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && !e.shiftKey) {
      // User is tabbing forward from Assign button
      if (drivers.length > 0) {
        e.preventDefault();
        hasCompletedFirstCycle.current = true;
        driverSelectRef.current?.focus();
      }
    }
  };

  // Handle shift+tab from driver select to go back to Assign
  const handleDriverSelectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      assignButtonRef.current?.focus();
    }
  };

  // Filter to active vehicles only
  const activeVehicles = vehicles.filter(v => v.status === "active");
  
  // Filter to unconfirmed drivers only (for driver picker)
  const unassignedDrivers = drivers.filter(d => d.status === "unconfirmed" && d.is_active);

  // Show driver select only if drivers list is provided and has entries
  const showDriverSelect = drivers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[380px]" 
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Assign {currentDriverName}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Report Time - First in tab order */}
          <div className="grid gap-2">
            <Label htmlFor="assign-report-time">Report Time (optional)</Label>
            <TimeInput
              ref={timeInputRef}
              id="assign-report-time"
              value={reportTime}
              onChange={(val) => {
                setReportTime(val);
                setValidationError("");
              }}
              placeholder="HH:MM"
              onEnterSubmit={handleAssign}
            />
          </div>

          {/* Vehicle - Second in tab order */}
          <div className="grid gap-2">
            <Label>Vehicle (optional)</Label>
            <VehicleCombobox
              vehicles={activeVehicles}
              value={selectedVehicle}
              onValueChange={(val) => {
                setSelectedVehicle(val);
                setValidationError("");
              }}
              placeholder="No vehicle"
              includeNone
            />
          </div>

          {/* Driver Select - Last in DOM, skipped in first cycle via tabIndex */}
          {showDriverSelect && (
            <div className="grid gap-2">
              <Label htmlFor="assign-driver">Driver</Label>
              <select
                ref={driverSelectRef}
                id="assign-driver"
                value={currentDriverId || ""}
                onChange={(e) => {
                  setCurrentDriverId(e.target.value);
                  setValidationError("");
                }}
                onKeyDown={handleDriverSelectKeyDown}
                tabIndex={-1}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {unassignedDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Cancel removed from tab order */}
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            tabIndex={-1}
          >
            Cancel
          </Button>
          <Button 
            ref={assignButtonRef}
            onClick={handleAssign}
            onKeyDown={handleAssignButtonKeyDown}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
