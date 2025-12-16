import { Truck, Wrench, Droplets, MapPin } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onStatusChange?: (newStatus: VehicleStatus) => void;
  onCleanStatusChange?: (newCleanStatus: CleanStatus) => void;
}

const vehicleStatusOptions: { value: VehicleStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "out-of-service", label: "Out of Service" },
];

const cleanStatusOptions: { value: CleanStatus; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "dirty", label: "Dirty" },
];

export function VehicleRow({ vehicle, onStatusChange, onCleanStatusChange }: VehicleRowProps) {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-1.5 focus:outline-none">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <StatusBadge status={vehicle.cleanStatus} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[100px]">
            {cleanStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onCleanStatusChange?.(option.value)}
                className={cn(
                  "cursor-pointer text-xs",
                  vehicle.cleanStatus === option.value && "bg-secondary"
                )}
              >
                <StatusBadge status={option.value} size="sm" />
                <span className="ml-2">{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {vehicle.assignedDriver && (
        <span className="hidden rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
          {vehicle.assignedDriver}
        </span>
      )}

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer focus:outline-none">
              <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[130px]">
            {vehicleStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange?.(option.value)}
                className={cn(
                  "cursor-pointer text-xs",
                  vehicle.status === option.value && "bg-secondary"
                )}
              >
                <StatusBadge status={option.value} size="sm" />
                <span className="ml-2">{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
