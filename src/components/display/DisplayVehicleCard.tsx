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

  const getStatusBgClass = () => {
    if (vehicle.status === "out-of-service") {
      return "bg-status-out-of-service/20";
    }
    switch (vehicle.clean_status) {
      case "clean":
        return "bg-status-active/20";
      case "dirty":
        return "bg-amber-500/20";
      default:
        return "bg-muted/20";
    }
  };

  const getBorderClass = () => {
    if (vehicle.status === "out-of-service") {
      return "border-l-4 border-l-status-out-of-service";
    }
    return vehicle.clean_status === "clean" 
      ? "border-l-4 border-l-status-active" 
      : vehicle.clean_status === "dirty" 
        ? "border-l-4 border-l-amber-500" 
        : "";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded border border-border bg-card px-1.5 py-1 transition-all duration-200",
        getBorderClass(),
        vehicle.status === "out-of-service" && "opacity-60"
      )}
    >
      {/* Left icon */}
      <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded", getStatusBgClass())}>
        {vehicle.status === "out-of-service" ? (
          <Wrench className={cn("h-2.5 w-2.5", getIconColor())} />
        ) : (
          <Truck className={cn("h-2.5 w-2.5", getIconColor())} />
        )}
      </div>

      {/* Vehicle unit */}
      <span className={cn(
        "font-mono text-xs font-medium",
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
          <span className="font-mono text-[9px] text-muted-foreground">
            {assignedDriver.code}
          </span>
        )}
      </div>
    </div>
  );
}
