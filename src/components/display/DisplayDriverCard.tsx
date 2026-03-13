import { Clock, Home, User, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DisplayDriverCardProps {
  driver: {
    id: string;
    name: string;
    code?: string | null;
    status: DriverStatus;
    vehicle?: string | null;
    report_time?: string | null;
    has_cdl?: boolean;
    default_vehicle?: string | null;
  };
  subcategory?: "has_vehicle" | "dispatched" | "report_time" | "scheduled";
}

export function DisplayDriverCard({ driver, subcategory }: DisplayDriverCardProps) {
  const hasVehicle = !!driver.vehicle;
  const hasTakeHome = !!driver.default_vehicle;
  const vehicleUnit = driver.vehicle;

  const formatReportTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return timeStr;
    }
  };

  const formattedReportTime = formatReportTime(driver.report_time);

  const getStatusAccent = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "border-l-status-active";
      case "confirmed":
        return hasVehicle ? "border-l-emerald-500" : "border-l-amber-500";
      case "done":
        return "border-l-muted-foreground/50";
      case "unconfirmed":
        return subcategory === "has_vehicle" || subcategory === "scheduled" ? "border-l-purple-500" : "border-l-border";
      default:
        return "border-l-border";
    }
  };

  const getIconColor = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "text-status-active";
      case "confirmed":
        return hasVehicle ? "text-emerald-500" : "text-amber-500";
      case "done":
        return "text-muted-foreground";
      case "unconfirmed":
        return subcategory === "has_vehicle" || subcategory === "scheduled" ? "text-purple-500" : "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5 transition-all duration-200",
        "border-l-[3px]",
        getStatusAccent(),
        driver.status === "done" && "opacity-50"
      )}
    >
      {/* Left icon */}
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        {hasTakeHome ? (
          <Home className={cn("h-3 w-3", getIconColor())} />
        ) : (
          <User className={cn("h-3 w-3", getIconColor())} />
        )}
      </div>

      {/* Driver code */}
      <span className={cn(
        "font-mono text-xs font-semibold truncate",
        driver.status === "done" ? "text-muted-foreground" : "text-foreground"
      )}>
        {driver.code || driver.name.split(' ')[0]}
      </span>
      
      {/* CDL Badge */}
      {driver.has_cdl && (
        <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20 shrink-0">
          CDL
        </span>
      )}

      {/* Right side metadata */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {driver.status === "confirmed" && formattedReportTime && (
          <span className="flex items-center gap-0.5 text-[9px] text-amber-500/90 font-mono tabular-nums">
            <Clock className="h-2.5 w-2.5" />
            {formattedReportTime}
          </span>
        )}
        {vehicleUnit && (driver.status === "on_the_clock" || driver.status === "confirmed" || subcategory === "has_vehicle") && (
          <span className="flex items-center gap-0.5 text-[9px] text-primary/80 font-mono tabular-nums">
            <Truck className="h-2.5 w-2.5" />
            {vehicleUnit}
          </span>
        )}
        {hasTakeHome && !vehicleUnit && (
          <span className="flex items-center gap-0.5 text-[9px] text-blue-400/80 font-mono tabular-nums">
            <Home className="h-2.5 w-2.5" />
            {driver.default_vehicle}
          </span>
        )}
      </div>
    </div>
  );
}
