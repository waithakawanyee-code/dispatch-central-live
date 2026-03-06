import { Clock, Home, CheckCircle2, User, Truck, Phone } from "lucide-react";
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
    phone?: string | null;
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
  showPhoneTooltip?: boolean;
}

export function DriverWorkbookCard({
  driver,
  shiftData,
  isSelected,
  isUpdated,
  onClick,
  onConfirm,
  subcategory,
  showPhoneTooltip = false,
}: DriverWorkbookCardProps) {
  const hasVehicle = !!driver.vehicle || !!shiftData?.vehicle_unit;
  const hasTakeHome = !!driver.default_vehicle;
  const vehicleUnit = shiftData?.vehicle_unit || driver.vehicle;
  
  // Format HH:MM:SS time string to readable format (e.g., "3:00p")
  const formatReportTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'p' : 'a';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
    } catch {
      return timeStr; // Return as-is if parsing fails
    }
  };

  const formattedReportTime = formatReportTime(driver.report_time);

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

  const cardContent = (
    <div
      data-driver-id={driver.id}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded border border-border bg-card px-1.5 py-1 transition-all duration-200 cursor-pointer",
        "hover:border-primary/30",
        getBorderClass(),
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
        isUpdated && "animate-row-flash",
        driver.status === "done" && "opacity-60"
      )}
    >
      {/* Left icon - matches VehicleRow style */}
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
      
      {/* CDL Badge - compact */}
      {driver.has_cdl && (
        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-primary/20 text-primary shrink-0">
          CDL
        </span>
      )}

      {/* Right side - Report time / Vehicle indicator */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        {/* Show report time for confirmed drivers */}
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

  // Wrap in tooltip if phone number should be shown
  if (showPhoneTooltip && driver.phone) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-2 bg-popover border border-border">
            <Phone className="h-3 w-3 text-primary" />
            <span className="font-mono text-sm">{driver.phone}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}
