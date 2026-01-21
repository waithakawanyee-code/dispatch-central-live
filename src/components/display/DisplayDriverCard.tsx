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

  // Format HH:MM:SS time string to readable format (e.g., "15:00")
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

  const getIconColor = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "text-status-active";
      case "confirmed":
        return hasVehicle ? "text-emerald-500" : "text-amber-500";
      case "done":
        return "text-muted-foreground";
      case "unconfirmed":
        return subcategory === "has_vehicle" || subcategory === "scheduled" ? "text-purple-500" : "text-slate-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBgClass = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "bg-status-active/20";
      case "confirmed":
        return hasVehicle ? "bg-emerald-500/20" : "bg-amber-500/20";
      case "done":
        return "bg-muted/20";
      case "unconfirmed":
        return subcategory === "has_vehicle" || subcategory === "scheduled" ? "bg-purple-500/20" : "bg-muted/20";
      default:
        return "bg-muted/20";
    }
  };

  const getBorderClass = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "border-l-4 border-l-status-active";
      case "confirmed":
        return hasVehicle ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500";
      case "unconfirmed":
        return subcategory === "has_vehicle" || subcategory === "scheduled" ? "border-l-4 border-l-purple-500" : "";
      case "done":
        return "border-l-4 border-l-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded border border-border bg-card px-1.5 py-1 transition-all duration-200",
        getBorderClass(),
        driver.status === "done" && "opacity-60"
      )}
    >
      {/* Left icon */}
      <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded", getStatusBgClass())}>
        {hasTakeHome ? (
          <Home className={cn("h-2.5 w-2.5", getIconColor())} />
        ) : (
          <User className={cn("h-2.5 w-2.5", getIconColor())} />
        )}
      </div>

      {/* Driver code */}
      <span className={cn(
        "font-mono text-xs font-medium truncate",
        driver.status === "done" ? "text-muted-foreground" : "text-foreground"
      )}>
        {driver.code || driver.name.split(' ')[0]}
      </span>
      
      {/* CDL Badge */}
      {driver.has_cdl && (
        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-primary/20 text-primary shrink-0">
          CDL
        </span>
      )}

      {/* Right side - Report time / Vehicle indicator */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {driver.status === "confirmed" && formattedReportTime && (
          <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-mono">
            <Clock className="h-2.5 w-2.5" />
            {formattedReportTime}
          </span>
        )}
        {vehicleUnit && (driver.status === "on_the_clock" || driver.status === "confirmed" || subcategory === "has_vehicle") && (
          <span className="flex items-center gap-0.5 text-[9px] text-primary font-mono">
            <Truck className="h-2.5 w-2.5" />
            {vehicleUnit}
          </span>
        )}
        {hasTakeHome && !vehicleUnit && (
          <span className="flex items-center gap-0.5 text-[9px] text-blue-500 font-mono">
            <Home className="h-2.5 w-2.5" />
            {driver.default_vehicle}
          </span>
        )}
      </div>
    </div>
  );
}
