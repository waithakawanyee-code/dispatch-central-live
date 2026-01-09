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

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  initialReportTime?: string;
  initialVehicle?: string;
  vehicles: VehicleRow[];
  onConfirm: (reportTime: string | undefined, vehicle: string | undefined) => void;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  driverName,
  initialReportTime = "",
  initialVehicle = "__none__",
  vehicles,
  onConfirm,
}: AssignDriverDialogProps) {
  const [reportTime, setReportTime] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("__none__");
  const [validationError, setValidationError] = useState("");
  const timeInputRef = useRef<HTMLInputElement>(null);
  const assignButtonRef = useRef<HTMLButtonElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReportTime(initialReportTime);
      setSelectedVehicle(initialVehicle);
      setValidationError("");

      // Focus report time input after dialog animation
      setTimeout(() => {
        timeInputRef.current?.focus();
        timeInputRef.current?.select();
      }, 50);
    }
  }, [open, initialReportTime, initialVehicle]);

  const vehicleValue = selectedVehicle === "__none__" ? undefined : selectedVehicle;
  const canAssign = reportTime.trim() !== "" || vehicleValue !== undefined;

  const handleAssign = () => {
    if (!canAssign) {
      setValidationError("Set Report Time or Vehicle to assign");
      timeInputRef.current?.focus();
      return;
    }
    setValidationError("");
    onConfirm(reportTime.trim() || undefined, vehicleValue);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  // Filter to active vehicles only
  const activeVehicles = vehicles.filter(v => v.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[380px]" 
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Assign {driverName}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Report Time - First in tab order */}
          <div className="grid gap-2">
            <Label htmlFor="assign-report-time">Report Time</Label>
            <TimeInput
              ref={timeInputRef}
              id="assign-report-time"
              value={reportTime}
              onChange={(val) => {
                setReportTime(val);
                setValidationError("");
              }}
              placeholder="e.g. 730, 9:00a, 14:30"
              onEnterSubmit={handleAssign}
            />
          </div>

          {/* Vehicle - Second in tab order */}
          <div className="grid gap-2">
            <Label>Vehicle</Label>
            <VehicleCombobox
              vehicles={activeVehicles}
              value={selectedVehicle}
              onValueChange={(val) => {
                setSelectedVehicle(val);
                setValidationError("");
              }}
              placeholder="Select vehicle"
              includeNone
            />
          </div>

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
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
