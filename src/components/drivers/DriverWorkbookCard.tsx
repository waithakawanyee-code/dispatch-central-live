import { Clock, Home, User, Truck, Phone, CheckCircle, LogOut, Power, Undo2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

export type DriverContextAction = 
  | "confirm"
  | "punch-in"
  | "quick-punch-in"
  | "punch-out"
  | "switch-vehicle"
  | "start-new-shift"
  | "mark-off"
  | "unconfirm"
  | "reset";

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
  onContextAction?: (driverId: string, action: DriverContextAction) => void;
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
  onContextAction,
  subcategory,
  showPhoneTooltip = false,
}: DriverWorkbookCardProps) {
  const hasVehicle = !!driver.vehicle || !!shiftData?.vehicle_unit;
  const hasTakeHome = !!driver.default_vehicle;
  const vehicleUnit = shiftData?.vehicle_unit || driver.vehicle;
  
  const formatReportTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'p' : 'a';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
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
        return subcategory === "has_vehicle" ? "border-l-blue-500" : "border-l-border";
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
        return subcategory === "has_vehicle" ? "text-blue-500" : "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getContextMenuItems = () => {
    if (!onContextAction) return null;
    
    const items: { label: string; icon: typeof CheckCircle; action: DriverContextAction; variant?: string }[] = [];
    
    switch (driver.status) {
      case "unconfirmed":
        items.push(
          { label: "Confirm", icon: CheckCircle, action: "confirm" },
          { label: "Punch In", icon: Clock, action: "punch-in" },
          { label: "Mark OFF", icon: Power, action: "mark-off", variant: "muted" },
        );
        break;
      case "confirmed":
        items.push(
          { label: "Punch In", icon: Clock, action: "punch-in" },
          { label: "Quick Punch In", icon: Clock, action: "quick-punch-in" },
          { label: "Mark OFF", icon: Power, action: "mark-off", variant: "muted" },
          { label: "Unconfirm", icon: Undo2, action: "unconfirm", variant: "muted" },
        );
        break;
      case "on_the_clock":
        items.push(
          { label: "Punch Out", icon: LogOut, action: "punch-out" },
          { label: "Switch Vehicle", icon: Truck, action: "switch-vehicle" },
        );
        break;
      case "done":
        items.push(
          { label: "Start New Shift", icon: RefreshCw, action: "start-new-shift" },
          { label: "Reset", icon: Undo2, action: "reset", variant: "muted" },
        );
        break;
    }
    
    return items;
  };

  const contextItems = getContextMenuItems();

  const cardContent = (
    <div
      data-driver-id={driver.id}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md border border-border/60 bg-card px-2.5 py-2 transition-all duration-200 cursor-pointer",
        "border-l-[3px]",
        getStatusAccent(),
        // Hover
        "hover:bg-accent/30 hover:border-border",
        // Selected
        isSelected && "ring-1 ring-primary/50 bg-accent/20 border-border shadow-[0_0_8px_hsl(var(--primary)/0.15)]",
        // Updated flash
        isUpdated && "animate-row-flash",
        // Done state
        driver.status === "done" && "opacity-50"
      )}
    >
      {/* Status icon */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {hasTakeHome ? (
          <Home className={cn("h-3.5 w-3.5", getIconColor())} />
        ) : (
          <User className={cn("h-3.5 w-3.5", getIconColor())} />
        )}
      </div>

      {/* Driver info - name is focal point */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          "block font-mono text-[13px] font-semibold leading-tight truncate",
          driver.status === "done" ? "text-muted-foreground" : "text-foreground"
        )}>
          {driver.code || driver.name.split(' ')[0]}
        </span>
      </div>

      {/* Right metadata cluster */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* CDL Badge */}
        {driver.has_cdl && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
            CDL
          </span>
        )}

        {/* Report time */}
        {driver.status === "confirmed" && formattedReportTime && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-500/90 font-mono tabular-nums">
            <Clock className="h-2.5 w-2.5" />
            {formattedReportTime}
          </span>
        )}

        {/* Vehicle */}
        {vehicleUnit && (driver.status === "on_the_clock" || driver.status === "confirmed" || subcategory === "has_vehicle") && (
          <span className="flex items-center gap-0.5 text-[10px] text-primary/80 font-mono tabular-nums">
            <Truck className="h-2.5 w-2.5" />
            {vehicleUnit}
          </span>
        )}

        {/* Take-home vehicle when no active vehicle */}
        {hasTakeHome && !vehicleUnit && (
          <span className="flex items-center gap-0.5 text-[10px] text-blue-400/80 font-mono tabular-nums">
            <Home className="h-2.5 w-2.5" />
            {driver.default_vehicle}
          </span>
        )}
      </div>
    </div>
  );

  const wrappedCardContent = showPhoneTooltip && driver.phone ? (
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
  ) : cardContent;

  // If we have context menu items, wrap with ContextMenu
  if (contextItems && contextItems.length > 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {wrappedCardContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[180px]">
          <div className="px-2 py-1.5 text-[11px] font-mono text-muted-foreground border-b border-border/50 mb-1">
            {driver.code || driver.name}
          </div>
          {contextItems.map((item, index) => (
            <ContextMenuItem
              key={item.action}
              onClick={() => onContextAction!(driver.id, item.action)}
              className={cn(
                "gap-2 text-xs cursor-pointer",
                item.variant === "muted" && "text-muted-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return wrappedCardContent;
}
