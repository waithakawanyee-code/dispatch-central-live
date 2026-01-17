import { useState } from "react";
import { Truck, Wrench, Droplets, User, Phone, Home, Unlock, Building2, Sparkles, CircleAlert, CircleHelp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ServiceTicketDialog } from "./ServiceTicketDialog";
import { VehicleTicketsSheet } from "./VehicleTicketsSheet";
import { MarkOOSDialog } from "./MarkOOSDialog";
import { MaintenanceEventSheet } from "./MaintenanceEventSheet";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import { useOpenMaintenanceEvent } from "@/hooks/useMaintenanceEvents";
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
  trolley: "Trolley"
};
type DriverRowType = Database["public"]["Tables"]["drivers"]["Row"];
interface VehicleRowProps {
  vehicle: VehicleRowType;
  onCleanStatusChange?: (newCleanStatus: CleanStatus) => void;
  canEdit?: boolean;
  isUpdated?: boolean;
  drivers?: DriverRowType[];
  openTicketCount?: number;
  hasAnyTickets?: boolean;
}
const cleanStatusOptions: {
  value: CleanStatus;
  label: string;
}[] = [{
  value: "clean",
  label: "Clean"
}, {
  value: "dirty",
  label: "Dirty"
}, {
  value: "unknown",
  label: "Unknown"
}];
export function VehicleRow({
  vehicle,
  onCleanStatusChange,
  canEdit = true,
  isUpdated = false,
  drivers = [],
  openTicketCount = 0,
  hasAnyTickets = false
}: VehicleRowProps) {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketsSheetOpen, setTicketsSheetOpen] = useState(false);
  const [markOOSDialogOpen, setMarkOOSDialogOpen] = useState(false);
  const [maintenanceSheetOpen, setMaintenanceSheetOpen] = useState(false);
  const {
    openEvent
  } = useOpenMaintenanceEvent(vehicle.id);

  // Find the driver details if the vehicle has a driver assigned
  const assignedDriver = vehicle.driver ? drivers.find(d => d.name === vehicle.driver) : null;

  // Icon color based on clean status for active vehicles, or status for OOS
  const getIconColor = () => {
    if (vehicle.status === "out-of-service") {
      return "text-status-out-of-service";
    }
    switch (vehicle.clean_status) {
      case "clean":
        return "text-status-active";
      // Green
      case "dirty":
        return "text-amber-500";
      // Yellow
      default:
        return "text-muted-foreground";
    }
  };
  const getStatusIcon = () => {
    const iconColor = getIconColor();
    if (vehicle.status === "out-of-service") {
      return <Wrench className={cn("h-3 w-3", iconColor)} />;
    }
    return <Truck className={cn("h-3 w-3", iconColor)} />;
  };
  const getStatusBgClass = () => {
    if (vehicle.status === "out-of-service") {
      return "bg-status-out-of-service/20";
    }
    switch (vehicle.clean_status) {
      case "clean":
        return "bg-status-active/20";
      case "dirty":
        return "bg-amber-500/20";
      default:
        return "bg-muted/20";
    }
  };
  const getBorderClass = () => {
    switch (vehicle.status) {
      case "active":
        return "border-l-4 border-l-status-active";
      case "out-of-service":
        return "border-l-4 border-l-status-out-of-service";
      default:
        return "";
    }
  };
  return <>
      <div className={cn("flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5 transition-all duration-200", "hover:border-primary/30", getBorderClass(), isUpdated && "animate-row-flash")}>
        <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", getStatusBgClass())}>
          {getStatusIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-mono text-sm font-medium text-foreground flex items-center gap-1">
              {vehicle.unit}
              {(vehicle as any).has_car_wash_subscription && <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-cyan-500">
                        <Droplets className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span className="text-xs">Car Wash Subscription</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>}
            </p>
            {/* Classification badges */}
            {vehicle.primary_category === "specialty" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-600 dark:text-purple-400">
                Specialty
              </span>}
            {/* Released as Fleet indicator */}
            {vehicle.classification === "take_home" && vehicle.released_as_fleet_until && new Date(vehicle.released_as_fleet_until) > new Date() && <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Unlock className="h-2.5 w-2.5" />
                      Fleet Today
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs">Released as Fleet until end of day</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>}
          </div>
          {vehicle.vehicle_type && <p className="text-[10px] text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}</p>}
        </div>

        {/* Right side: Clean indicator + Driver code */}
        <div className="flex flex-col items-center gap-0.5">
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center justify-center focus:outline-none">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                          vehicle.clean_status === "clean" && "text-status-clean",
                          vehicle.clean_status === "dirty" && "text-status-dirty animate-dirty-pulse",
                          vehicle.clean_status === "unknown" && "text-muted-foreground"
                        )}>
                          {vehicle.clean_status === "clean" && <Sparkles className="h-4 w-4" />}
                          {vehicle.clean_status === "dirty" && <CircleAlert className="h-4 w-4" />}
                          {vehicle.clean_status === "unknown" && <CircleHelp className="h-4 w-4" />}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <span className="text-xs capitalize">{vehicle.clean_status}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[100px]">
                {cleanStatusOptions.map(option => (
                  <DropdownMenuItem 
                    key={option.value} 
                    onClick={() => onCleanStatusChange?.(option.value)} 
                    className={cn("cursor-pointer text-xs gap-2", vehicle.clean_status === option.value && "bg-secondary")}
                  >
                    <span className={cn(
                      option.value === "clean" && "text-status-clean",
                      option.value === "dirty" && "text-status-dirty",
                      option.value === "unknown" && "text-muted-foreground"
                    )}>
                      {option.value === "clean" && <Sparkles className="h-3.5 w-3.5" />}
                      {option.value === "dirty" && <CircleAlert className="h-3.5 w-3.5" />}
                      {option.value === "unknown" && <CircleHelp className="h-3.5 w-3.5" />}
                    </span>
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    vehicle.clean_status === "clean" && "text-status-clean",
                    vehicle.clean_status === "dirty" && "text-status-dirty animate-dirty-pulse",
                    vehicle.clean_status === "unknown" && "text-muted-foreground"
                  )}>
                    {vehicle.clean_status === "clean" && <Sparkles className="h-4 w-4" />}
                    {vehicle.clean_status === "dirty" && <CircleAlert className="h-4 w-4" />}
                    {vehicle.clean_status === "unknown" && <CircleHelp className="h-4 w-4" />}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <span className="text-xs capitalize">{vehicle.clean_status}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Driver code below clean indicator */}
          {assignedDriver?.code && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-mono text-[10px] text-muted-foreground cursor-default hover:text-foreground transition-colors">
                    {assignedDriver.code}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="p-2">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold">{vehicle.driver}</span>
                    {assignedDriver.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {assignedDriver.phone}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
        </div>
      </div>

      {/* Dialogs */}
      <ServiceTicketDialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} />

      <VehicleTicketsSheet open={ticketsSheetOpen} onOpenChange={setTicketsSheetOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} />

      <MarkOOSDialog open={markOOSDialogOpen} onOpenChange={setMarkOOSDialogOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} onOpenExistingTicket={() => setMaintenanceSheetOpen(true)} />

      <MaintenanceEventSheet open={maintenanceSheetOpen} onOpenChange={setMaintenanceSheetOpen} event={openEvent || null} vehicleUnit={vehicle.unit} />
    </>;
}