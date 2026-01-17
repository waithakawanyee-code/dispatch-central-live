import { Clock, Home, CheckCircle2, User, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DriverWorkbookCardProps {
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
  shiftData?: {
    punch_in_at?: string | null;
    punch_out_at?: string | null;
    vehicle_unit?: string | null;
  } | null;
  isSelected?: boolean;
  isUpdated?: boolean;
  onClick?: () => void;
  onConfirm?: (driverId: string) => void;
  subcategory?: "has_vehicle" | "dispatched" | "report_time";
}

export function DriverWorkbookCard({
  driver,
  shiftData,
  isSelected,
  isUpdated,
  onClick,
  onConfirm,
  subcategory,
}: DriverWorkbookCardProps) {
  const hasVehicle = !!driver.vehicle || !!shiftData?.vehicle_unit;
  const hasTakeHome = !!driver.default_vehicle;
  const vehicleUnit = shiftData?.vehicle_unit || driver.vehicle;
  
  // Format time for display
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const punchInTime = formatTime(shiftData?.punch_in_at);
  const punchOutTime = formatTime(shiftData?.punch_out_at);

  // Get icon color based on status (matches VehicleRow pattern)
  const getIconColor = () => {
    switch (driver.status) {
      case "on_the_clock":
        return "text-status-active";
      case "confirmed":
        return hasVehicle ? "text-emerald-500" : "text-amber-500";
      case "done":
        return "text-muted-foreground";
      case "unconfirmed":
        return subcategory === "has_vehicle" ? "text-blue-500" : "text-slate-500";
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
        return subcategory === "has_vehicle" ? "bg-blue-500/20" : "bg-muted/20";
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
        return subcategory === "has_vehicle" ? "border-l-4 border-l-blue-500" : "";
      case "done":
        return "border-l-4 border-l-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5 transition-all duration-200 cursor-pointer",
        "hover:border-primary/30",
        getBorderClass(),
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
        isUpdated && "animate-row-flash",
        driver.status === "done" && "opacity-60"
      )}
    >
      {/* Left icon - matches VehicleRow style */}
      <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", getStatusBgClass())}>
        {hasTakeHome ? (
          <Home className={cn("h-3 w-3", getIconColor())} />
        ) : (
          <User className={cn("h-3 w-3", getIconColor())} />
        )}
      </div>

      {/* Middle content - name and subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn(
            "font-mono text-sm font-medium",
            driver.status === "done" ? "text-muted-foreground" : "text-foreground"
          )}>
            {driver.code || driver.name.split(' ')[0]}
          </p>
          {/* CDL Badge */}
          {driver.has_cdl && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">
              CDL
            </span>
          )}
          {/* Confirm button for unconfirmed drivers with vehicle */}
          {subcategory === "has_vehicle" && driver.status === "unconfirmed" && onConfirm && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onConfirm(driver.id);
              }}
            >
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
              Confirm
            </Button>
          )}
        </div>
        {/* Report time or status subtitle */}
        {(driver.status === "unconfirmed" || driver.status === "confirmed") && driver.report_time && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {driver.report_time.slice(0, 5)}
            {subcategory === "report_time" && (
              <span className="ml-1 text-amber-500">Needs Vehicle</span>
            )}
          </p>
        )}
        {driver.status === "on_the_clock" && punchInTime && (
          <p className="text-[10px] text-muted-foreground">
            <span className="text-status-active">IN</span> {punchInTime}
          </p>
        )}
        {driver.status === "done" && (punchInTime || punchOutTime) && (
          <p className="text-[10px] text-muted-foreground font-mono">
            {punchInTime && <span>{punchInTime}</span>}
            {punchInTime && punchOutTime && <span> → </span>}
            {punchOutTime && <span>{punchOutTime}</span>}
          </p>
        )}
      </div>

      {/* Right side - Vehicle indicator (matches VehicleRow right column pattern) */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {/* Vehicle unit if assigned */}
        {vehicleUnit && (driver.status === "on_the_clock" || driver.status === "confirmed" || subcategory === "has_vehicle") && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-default hover:text-foreground transition-colors">
                  <Truck className="h-2.5 w-2.5 text-primary" />
                  <span className="font-mono">{vehicleUnit}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">
                <span className="text-xs">Assigned Vehicle: {vehicleUnit}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Take Home vehicle indicator */}
        {hasTakeHome && !vehicleUnit && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-default hover:text-foreground transition-colors">
                  <Home className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-mono">{driver.default_vehicle}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">
                <span className="text-xs">Take Home: {driver.default_vehicle}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
