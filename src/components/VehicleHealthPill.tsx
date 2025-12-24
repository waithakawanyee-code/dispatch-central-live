import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

export type HealthState = "green" | "yellow" | "red";

interface VehicleHealthPillProps {
  vehicleStatus: VehicleStatus;
  openTicketCount: number;
  className?: string;
}

export function getHealthState(
  vehicleStatus: VehicleStatus,
  openTicketCount: number
): HealthState {
  // Red: vehicle is out-of-service (regardless of tickets)
  if (vehicleStatus === "out-of-service" || vehicleStatus === "maintenance") {
    return "red";
  }
  
  // Yellow: vehicle is active but has open tickets
  if (openTicketCount > 0) {
    return "yellow";
  }
  
  // Green: vehicle is active with no open tickets
  return "green";
}

export function VehicleHealthPill({
  vehicleStatus,
  openTicketCount,
  className,
}: VehicleHealthPillProps) {
  const healthState = getHealthState(vehicleStatus, openTicketCount);

  const getStyles = () => {
    switch (healthState) {
      case "green":
        return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
      case "yellow":
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
      case "red":
        return "bg-red-500/20 text-red-600 border-red-500/30";
    }
  };

  const getLabel = () => {
    switch (healthState) {
      case "green":
        return "OK";
      case "yellow":
        return `Open Ticket${openTicketCount > 1 ? "s" : ""}: ${openTicketCount}`;
      case "red":
        return "OOS";
    }
  };

  const getDot = () => {
    switch (healthState) {
      case "green":
        return "bg-emerald-500";
      case "yellow":
        return "bg-amber-500";
      case "red":
        return "bg-red-500";
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        getStyles(),
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", getDot())} />
      {getLabel()}
    </div>
  );
}
