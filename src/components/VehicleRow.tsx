import { useState } from "react";
import { Truck, Wrench, Droplets, User, Phone, Plus, FileText, SprayCan, Home, Unlock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { VehicleHealthPill } from "./VehicleHealthPill";
import { ServiceTicketDialog } from "./ServiceTicketDialog";
import { VehicleTicketsSheet } from "./VehicleTicketsSheet";
import { MarkOOSDialog } from "./MarkOOSDialog";
import { MaintenanceEventSheet } from "./MaintenanceEventSheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";
import { useOpenMaintenanceEvent } from "@/hooks/useMaintenanceEvents";
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

// Status transition rules: Mark OOS opens dialog, Return to Service closes maintenance event
const getAvailableStatusActions = (currentStatus: VehicleStatus): {
  action: "mark-oos" | "return-to-service";
  label: string;
}[] => {
  if (currentStatus === "active") {
    return [{
      action: "mark-oos",
      label: "Mark Out of Service"
    }];
  } else {
    return [{
      action: "return-to-service",
      label: "Return to Service"
    }];
  }
};
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
  const availableActions = getAvailableStatusActions(vehicle.status);
  const getStatusIcon = () => {
    switch (vehicle.status) {
      case "active":
        return <Truck className="h-3.5 w-3.5 text-status-active" />;
      case "out-of-service":
        return <Wrench className="h-3.5 w-3.5 text-status-out-of-service" />;
      default:
        return <Truck className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };
  const getStatusBgClass = () => {
    switch (vehicle.status) {
      case "active":
        return "bg-status-active/20";
      case "out-of-service":
        return "bg-status-out-of-service/20";
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
      <div className={cn("flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200", "hover:border-primary/30", getBorderClass(), isUpdated && "animate-row-flash")}>
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded", getStatusBgClass())}>
          {getStatusIcon()}
        </div>

        <div className="min-w-[130px] flex-1">
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
            {/* Take-home badge */}
            {vehicle.primary_category === "above_all" && vehicle.classification === "take_home" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Home className="h-2.5 w-2.5" />
              </span>
            )}
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
          {/* Show Owner for Take Home vehicles */}
          {vehicle.classification === "take_home" && vehicle.assigned_driver_id && <p className="text-[10px] text-muted-foreground">
              Owner: <span className="font-medium">{drivers.find(d => d.id === vehicle.assigned_driver_id)?.name || "Unknown"}</span>
            </p>}
          {/* Show currently assigned driver if different from owner */}
          {vehicle.driver && <TooltipProvider delayDuration={1000}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-[10px] text-muted-foreground cursor-default hover:text-foreground transition-colors">
                    {vehicle.classification === "take_home" && vehicle.assigned_driver_id ? vehicle.driver !== drivers.find(d => d.id === vehicle.assigned_driver_id)?.name ? `Assigned: ${vehicle.driver}` : null : vehicle.driver}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="font-semibold text-foreground">{vehicle.driver}</div>
                    {assignedDriver?.code && <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="font-mono">{assignedDriver.code}</span>
                      </div>}
                    {assignedDriver?.phone && <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="font-mono">{assignedDriver.phone}</span>
                      </div>}
                    {!assignedDriver?.code && !assignedDriver?.phone && <span className="text-muted-foreground italic">No contact info</span>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>}
        </div>

        {/* Health Pill */}
        <VehicleHealthPill vehicleStatus={vehicle.status} openTicketCount={openTicketCount} />

        {/* Quick Actions */}
        {canEdit && <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTicketDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Ticket</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {hasAnyTickets && <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTicketsSheetOpen(true)}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Tickets</TooltipContent>
                </Tooltip>
              </TooltipProvider>}
          </div>}

        {canEdit ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex cursor-pointer items-center gap-1.5 focus:outline-none">
                <Droplets className="h-3 w-3 text-muted-foreground" />
                <StatusBadge status={vehicle.clean_status} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              {cleanStatusOptions.map(option => <DropdownMenuItem key={option.value} onClick={() => onCleanStatusChange?.(option.value)} className={cn("cursor-pointer text-xs", vehicle.clean_status === option.value && "bg-secondary")}>
                  <StatusBadge status={option.value} size="sm" />
                  <span className="ml-2">{option.label}</span>
                </DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu> : <div className="flex items-center gap-1.5">
            <Droplets className="h-3 w-3 text-muted-foreground" />
            <StatusBadge status={vehicle.clean_status} size="sm" />
          </div>}

        <div className="ml-auto">
          {canEdit ? <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer focus:outline-none">
                  <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {availableActions.map(option => <DropdownMenuItem key={option.action} onClick={() => {
              if (option.action === "mark-oos") {
                setMarkOOSDialogOpen(true);
              } else if (option.action === "return-to-service") {
                setMaintenanceSheetOpen(true);
              }
            }} className="cursor-pointer text-xs">
                    {option.action === "mark-oos" ? <Wrench className="h-3 w-3 mr-2 text-status-out-of-service" /> : <Truck className="h-3 w-3 mr-2 text-status-active" />}
                    <span>{option.label}</span>
                  </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu> : <StatusBadge status={vehicle.status} showPulse={vehicle.status === "active"} size="sm" />}
        </div>
      </div>

      {/* Dialogs */}
      <ServiceTicketDialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} />

      <VehicleTicketsSheet open={ticketsSheetOpen} onOpenChange={setTicketsSheetOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} />

      <MarkOOSDialog open={markOOSDialogOpen} onOpenChange={setMarkOOSDialogOpen} vehicleId={vehicle.id} vehicleUnit={vehicle.unit} onOpenExistingTicket={() => setMaintenanceSheetOpen(true)} />

      <MaintenanceEventSheet open={maintenanceSheetOpen} onOpenChange={setMaintenanceSheetOpen} event={openEvent || null} vehicleUnit={vehicle.unit} />
    </>;
}