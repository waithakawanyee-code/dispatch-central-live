import { Clock, Truck, Home, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DriverWorkbookCardProps {
  driver: {
    id: string;
    name: string;
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

  // Determine visual style based on status
  const getStatusStyles = () => {
    switch (driver.status) {
      case "unconfirmed":
        if (subcategory === "has_vehicle") {
          return {
            border: "border-blue-500/30",
            bg: "bg-blue-500/5",
            dot: "bg-blue-500",
            hover: "hover:border-blue-500/50 hover:bg-blue-500/10",
          };
        }
        return {
          border: "border-slate-500/30",
          bg: "bg-card",
          dot: "bg-slate-500",
          hover: "hover:border-primary/30 hover:bg-card/80",
        };
      case "confirmed":
        if (subcategory === "dispatched" || hasVehicle) {
          return {
            border: "border-emerald-500/40",
            bg: "bg-emerald-500/10",
            dot: "bg-emerald-500",
            hover: "hover:border-emerald-500/60 hover:bg-emerald-500/15",
          };
        }
        return {
          border: "border-amber-500/30",
          bg: "bg-amber-500/5",
          dot: "bg-amber-500",
          hover: "hover:border-amber-500/50 hover:bg-amber-500/10",
        };
      case "on_the_clock":
        return {
          border: "border-status-active/40",
          bg: "bg-status-active/10",
          dot: "bg-status-active",
          hover: "hover:border-status-active/60 hover:bg-status-active/15",
        };
      case "done":
        return {
          border: "border-muted/50",
          bg: "bg-muted/20",
          dot: "bg-muted-foreground",
          hover: "hover:border-muted-foreground/30",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          dot: "bg-muted-foreground",
          hover: "hover:border-primary/30",
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200 cursor-pointer",
        styles.border,
        styles.bg,
        styles.hover,
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-[0_0_12px_hsl(var(--primary)/0.3)]",
        isUpdated && "animate-row-flash",
        driver.status === "done" && "opacity-60"
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {hasTakeHome ? (
          <Home className={cn("h-3.5 w-3.5", driver.status === "done" ? "text-muted-foreground" : "text-primary")} />
        ) : (
          <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
        )}
      </div>

      {/* Driver name */}
      <span className={cn(
        "font-medium text-sm flex-1 truncate",
        driver.status === "done" ? "text-muted-foreground" : "text-foreground"
      )}>
        {driver.name}
      </span>

      {/* Badges and info */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Confirm button for unconfirmed drivers with vehicle */}
        {subcategory === "has_vehicle" && driver.status === "unconfirmed" && onConfirm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(driver.id);
            }}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirm
          </Button>
        )}

        {/* CDL Badge */}
        {driver.has_cdl && (
          <span className="text-[9px] font-bold tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded uppercase">
            CDL
          </span>
        )}

        {/* Vehicle indicator - show for unconfirmed with vehicle, confirmed dispatched, or on_the_clock */}
        {vehicleUnit && (driver.status === "on_the_clock" || driver.status === "confirmed" || subcategory === "has_vehicle") && (
          <div className="flex items-center gap-1 text-xs font-mono text-primary">
            <Truck className="h-3 w-3" />
            <span>{vehicleUnit}</span>
          </div>
        )}

        {/* Report time indicator for confirmed drivers needing vehicle */}
        {subcategory === "report_time" && driver.report_time && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Truck className="h-3 w-3" />
            <span className="text-[10px] font-medium">Needs</span>
          </div>
        )}

        {/* Report time for unconfirmed/confirmed */}
        {(driver.status === "unconfirmed" || driver.status === "confirmed") && driver.report_time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            <span>{driver.report_time.slice(0, 5)}</span>
          </div>
        )}

        {/* Punch-in time for on_the_clock */}
        {driver.status === "on_the_clock" && punchInTime && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <span className="text-status-active">IN</span>
            <span>{punchInTime}</span>
          </div>
        )}

        {/* Punch times for done */}
        {driver.status === "done" && (punchInTime || punchOutTime) && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            {punchInTime && <span>{punchInTime}</span>}
            {punchInTime && punchOutTime && <span>→</span>}
            {punchOutTime && <span>{punchOutTime}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
