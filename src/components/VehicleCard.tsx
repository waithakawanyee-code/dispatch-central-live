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

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const isAtBase = vehicle.location === "at-base";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all duration-300",
        "hover:border-primary/30 hover:bg-card/80",
        vehicle.status === "active" && "border-l-4 border-l-status-active",
        vehicle.status === "out-of-service" && "border-l-4 border-l-status-out-of-service"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              vehicle.status === "active" ? "bg-status-active/20" : "bg-status-out-of-service/20"
            )}
          >
            {vehicle.status === "active" ? (
              <Truck className="h-5 w-5 text-status-active" />
            ) : (
              <Wrench className="h-5 w-5 text-status-out-of-service" />
            )}
          </div>
          <div>
            <h3 className="font-mono font-semibold text-foreground">{vehicle.plate}</h3>
            <p className="text-xs text-muted-foreground">{vehicle.model}</p>
          </div>
        </div>
        <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="capitalize">{vehicle.location.replace("-", " ")}</span>
          </div>
          {isAtBase && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <StatusBadge status={vehicle.cleanStatus} size="sm" />
            </div>
          )}
        </div>

        {vehicle.assignedDriver && (
          <div className="rounded bg-secondary/50 px-2 py-1">
            <span className="text-xs text-muted-foreground">Assigned: </span>
            <span className="text-xs font-medium text-foreground">{vehicle.assignedDriver}</span>
          </div>
        )}

        {vehicle.lastService && (
          <p className="font-mono text-xs text-muted-foreground">
            Last service: {vehicle.lastService}
          </p>
        )}
      </div>
    </div>
  );
}
