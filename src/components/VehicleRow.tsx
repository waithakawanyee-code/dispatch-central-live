import { Truck, Wrench, Droplets } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type VehicleRowType = Database["public"]["Tables"]["vehicles"]["Row"];

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan_volvo: "Sedan-Volvo",
  sedan_aviator: "Sedan Aviator",
  suv: "SUV",
  exec_transit: "Exec Transit",
  sprinter_limo: "Sprinter Limo",
  stretch_limo: "Stretch Limo",
  "28_shuttle": "28 Shuttle",
  "37_shuttle": "37 Shuttle",
  "39_shuttle": "39 Shuttle",
  "56_mc": "56 MC",
  "32_limo_bus": "32-Limo Bus",
  trolley: "Trolley",
};

interface VehicleRowProps {
  vehicle: VehicleRowType;
  onStatusChange?: (newStatus: VehicleStatus) => void;
  onCleanStatusChange?: (newCleanStatus: CleanStatus) => void;
  canEdit?: boolean;
  isUpdated?: boolean;
}

const vehicleStatusOptions: { value: VehicleStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "out-of-service", label: "Out of Service" },
];

const cleanStatusOptions: { value: CleanStatus; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "dirty", label: "Dirty" },
];

export function VehicleRow({ vehicle, onStatusChange, onCleanStatusChange, canEdit = true, isUpdated = false }: VehicleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200",
        "hover:border-primary/30",
        vehicle.status === "active" && "border-l-4 border-l-status-active",
        vehicle.status === "out-of-service" && "border-l-4 border-l-status-out-of-service",
        isUpdated && "animate-row-flash"
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

      <div className="min-w-[90px] flex-1">
        <p className="font-mono text-sm font-medium text-foreground">{vehicle.unit}</p>
        {vehicle.vehicle_type && (
          <p className="text-[10px] text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}</p>
        )}
        {vehicle.driver && (
          <p className="text-[10px] text-muted-foreground">{vehicle.driver}</p>
        )}
      </div>

      {vehicle.mileage && (
        <span className="hidden font-mono text-[10px] text-muted-foreground md:inline">
          {vehicle.mileage.toLocaleString()} mi
        </span>
      )}

      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-1.5 focus:outline-none">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <StatusBadge status={vehicle.clean_status} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[100px]">
            {cleanStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onCleanStatusChange?.(option.value)}
                className={cn(
                  "cursor-pointer text-xs",
                  vehicle.clean_status === option.value && "bg-secondary"
                )}
              >
                <StatusBadge status={option.value} size="sm" />
                <span className="ml-2">{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3 w-3 text-muted-foreground" />
          <StatusBadge status={vehicle.clean_status} size="sm" />
        </div>
      )}

      <div className="ml-auto">
        {canEdit ? (
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
        ) : (
          <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />
        )}
      </div>
    </div>
  );
}
