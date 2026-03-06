import { User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DriverProfileForm } from "./DriverProfileForm";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

interface DriverProfileDialogProps {
  driver: DriverRow | null;
  vehicles: VehicleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  mode?: "add" | "edit";
}

export function DriverProfileDialog({
  driver,
  vehicles,
  open,
  onOpenChange,
  onSaved,
  mode = "edit",
}: DriverProfileDialogProps) {
  const isAddMode = mode === "add";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isAddMode ? "Add New Driver" : "Driver Profile"}
          </SheetTitle>
        </SheetHeader>

        <DriverProfileForm
          driver={driver}
          vehicles={vehicles}
          onSaved={() => {
            onOpenChange(false);
            onSaved?.();
          }}
          mode={mode}
        />
      </SheetContent>
    </Sheet>
  );
}
