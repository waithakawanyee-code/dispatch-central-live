import { Truck, Wrench, Droplets, MapPin } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

type VehicleStatus = "active" | "out-of-service";
type CleanStatus = "clean" | "dirty";

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: VehicleStatus;
  cleanStatus: CleanStatus;
  location: "on-route" | "at-base";
  assignedDriver?: string;
  lastService?: string;
}

interface VehicleRowProps {
  vehicle: Vehicle;
}

export function VehicleRow({ vehicle }: VehicleRowProps) {
  const isAtBase = vehicle.location === "at-base";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200",
        "hover:border-primary/30",
        vehicle.status === "active" && "border-l-4 border-l-status-active",
        vehicle.status === "out-of-service" && "border-l-4 border-l-status-out-of-service"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded",
          vehicle.status === "active" ? "bg-status-active/20" : "bg-status-out-of-service/20"
        )}
      >
        {vehicle.status === "active" ? (
          <Truck className="h-3.5 w-3.5 text-status-active" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-status-out-of-service" />
        )}
      </div>

      <div className="min-w-[90px]">
        <p className="font-mono text-sm font-medium text-foreground">{vehicle.plate}</p>
        <p className="text-[10px] text-muted-foreground">{vehicle.model}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span className="capitalize">{vehicle.location.replace("-", " ")}</span>
      </div>

      {isAtBase && (
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3 w-3 text-muted-foreground" />
          <StatusBadge status={vehicle.cleanStatus} size="sm" />
        </div>
      )}

      {vehicle.assignedDriver && (
        <span className="hidden rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
          {vehicle.assignedDriver}
        </span>
      )}

      <div className="ml-auto">
        <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />
      </div>
    </div>
  );
}
