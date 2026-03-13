import { Truck, Sparkles, CircleAlert, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface DisplayVehicleCardProps {
  vehicle: VehicleRow;
  drivers?: DriverRow[];
}

export function DisplayVehicleCard({ vehicle, drivers = [] }: DisplayVehicleCardProps) {
  const assignedDriver = vehicle.driver ? drivers.find(d => d.name === vehicle.driver) : null;

  const getIconColor = () => {
    if (vehicle.status === "out-of-service") {
      return "text-status-out-of-service";
    }
    switch (vehicle.clean_status) {
      case "clean":
        return "text-status-active";
      case "dirty":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusAccent = () => {
    if (vehicle.status === "out-of-service") {
      return "border-l-status-out-of-service";
    }
    return vehicle.clean_status === "clean"
      ? "border-l-status-active"
      : vehicle.clean_status === "dirty"
        ? "border-l-amber-500"
        : "border-l-border";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5 transition-all duration-200",
        "border-l-[3px]",
        getStatusAccent(),
        vehicle.status === "out-of-service" && "opacity-50"
      )}
    >
      {/* Left icon */}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        {vehicle.status === "out-of-service" ? (
          <Wrench className={cn("h-3 w-3", getIconColor())} />
        ) : (
          <Truck className={cn("h-3 w-3", getIconColor())} />
        )}
      </div>

      {/* Vehicle unit */}
      <span className={cn(
        "font-mono text-xs font-semibold",
        vehicle.status === "out-of-service" ? "text-muted-foreground" : "text-foreground"
      )}>
        {vehicle.unit}
      </span>

      {/* Right side - Clean status + Driver */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Clean status indicator */}
        <span className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full",
          vehicle.clean_status === "clean" && "text-status-clean",
          vehicle.clean_status === "dirty" && "text-status-dirty",
          vehicle.clean_status === "unknown" && "text-muted-foreground"
        )}>
          {vehicle.clean_status === "clean" && <Sparkles className="h-3 w-3" />}
          {vehicle.clean_status === "dirty" && <CircleAlert className="h-3 w-3" />}
        </span>

        {/* Driver code */}
        {assignedDriver?.code && (
          <span className="font-mono text-[9px] text-muted-foreground/80">
            {assignedDriver.code}
          </span>
        )}
      </div>
    </div>
  );
}
