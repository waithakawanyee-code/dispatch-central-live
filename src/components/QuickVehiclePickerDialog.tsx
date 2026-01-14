import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

interface QuickVehiclePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  vehicles: VehicleRow[];
  onConfirm: (vehicleUnit: string) => void;
}

export function QuickVehiclePickerDialog({
  open,
  onOpenChange,
  driverName,
  vehicles,
  onConfirm,
}: QuickVehiclePickerDialogProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("__none__");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedVehicle("__none__");
    }
  }, [open]);

  // Handle vehicle selection - auto-confirm when a vehicle is selected
  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    if (value && value !== "__none__") {
      onConfirm(value);
      onOpenChange(false);
    }
  };

  const activeVehicles = vehicles.filter(v => v.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Quick Punch In: {driverName}</DialogTitle>
          <DialogDescription>
            Select a vehicle to punch in
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <VehicleCombobox
            vehicles={activeVehicles}
            value={selectedVehicle}
            onValueChange={handleVehicleChange}
            placeholder="Search vehicle..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
