import { useState } from "react";
import { User, Phone, Clock, Truck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];
type DriverRowType = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRowType = Database["public"]["Tables"]["vehicles"]["Row"];

interface DriverRowProps {
  driver: DriverRowType;
  onStatusChange?: (newStatus: DriverStatus, reportTime?: string, vehicle?: string) => void;
  canEdit?: boolean;
  isUpdated?: boolean;
  compact?: boolean;
  availableVehicles?: VehicleRowType[];
}

// Workflow: Unassigned → Assigned → Working → Punched Out
const statusOptions: { value: DriverStatus; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "working", label: "Working" },
  { value: "punched-out", label: "Punched Out" },
];

const assignedStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "working", label: "Punch In" },
  { value: "unassigned", label: "Unassign" },
];

const workingStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "punched-out", label: "Punch Out" },
];

const punchedOutStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "unassigned", label: "Reset to Unassigned" },
];

const compactStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
];

const compactAssignedOptions: { value: DriverStatus; label: string }[] = [
  { value: "working", label: "Punch In" },
  { value: "unassigned", label: "Unassign" },
];

const compactWorkingOptions: { value: DriverStatus; label: string }[] = [
  { value: "punched-out", label: "Punch Out" },
];

const compactPunchedOutOptions: { value: DriverStatus; label: string }[] = [
  { value: "unassigned", label: "Reset" },
];

export function DriverRow({ driver, onStatusChange, canEdit = true, isUpdated = false, compact = false, availableVehicles = [] }: DriverRowProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [reportTime, setReportTime] = useState(driver.report_time?.slice(0, 5) || "");
  const [selectedVehicle, setSelectedVehicle] = useState(driver.vehicle || "__none__");

  const handleStatusSelect = (status: DriverStatus) => {
    if (status === "assigned") {
      setReportTime(driver.report_time?.slice(0, 5) || "");
      setSelectedVehicle(driver.vehicle || "__none__");
      setShowAssignDialog(true);
    } else {
      onStatusChange?.(status);
    }
  };

  const vehicleValue = selectedVehicle === "__none__" ? undefined : selectedVehicle;
  const canAssign = reportTime.trim() !== "" || vehicleValue !== undefined;

  const handleAssign = () => {
    if (!canAssign) return;
    onStatusChange?.("assigned", reportTime || undefined, vehicleValue);
    setShowAssignDialog(false);
  };

  if (compact) {
    const content = (
      <div
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-xs transition-all duration-200",
          "hover:border-primary/30",
          canEdit && "cursor-pointer",
          driver.status === "available" && "border-l-2 border-l-status-available",
          driver.status === "on-route" && "border-l-2 border-l-status-on-route",
          driver.status === "break" && "border-l-2 border-l-status-break",
          driver.status === "offline" && "border-l-2 border-l-status-offline opacity-60",
          driver.status === "off" && "border-l-2 border-l-status-offline opacity-60",
          driver.status === "scheduled" && "border-l-2 border-l-amber-500 bg-amber-500/10",
          driver.status === "assigned" && "border-l-2 border-l-emerald-500 bg-emerald-500/10",
          driver.status === "working" && "border-l-2 border-l-status-available",
          isUpdated && "animate-row-flash"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            driver.status === "scheduled" && "bg-amber-500",
            driver.status === "assigned" && "bg-emerald-500",
            driver.status === "available" && "bg-status-available",
            driver.status === "on-route" && "bg-status-on-route",
            driver.status === "break" && "bg-status-break",
            driver.status === "offline" && "bg-status-offline",
            driver.status === "off" && "bg-status-offline",
            driver.status === "working" && "bg-status-available"
          )}
        />
        <div className="flex flex-col">
          <span className="font-mono font-semibold text-foreground">{driver.name}</span>
          {driver.vehicle && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-primary">
              <Truck className="h-2.5 w-2.5" />
              {driver.vehicle}
            </span>
          )}
        </div>
      </div>
    );

    if (canEdit) {
      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {content}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px]">
              {(["punched-out", "offline", "off"].includes(driver.status) ? compactPunchedOutOptions : ["working", "on-route"].includes(driver.status) ? compactWorkingOptions : driver.status === "assigned" ? compactAssignedOptions : compactStatusOptions).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-xs",
                    driver.status === option.value && "bg-secondary"
                  )}
                >
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="sm:max-w-[350px]">
              <DialogHeader>
                <DialogTitle>Assign {driver.name}</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                Either report time or vehicle is required.
              </p>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="report-time-compact">Report Time</Label>
                  <Input
                    id="report-time-compact"
                    type="time"
                    value={reportTime}
                    onChange={(e) => setReportTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle-compact">Vehicle</Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No vehicle</SelectItem>
                      {availableVehicles
                        .filter((v) => v.status === "active")
                        .map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.unit}>
                            {vehicle.unit} {vehicle.driver && vehicle.driver !== driver.name ? `(${vehicle.driver})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssign} disabled={!canAssign}>
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    return content;
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200",
          "hover:border-primary/30",
          driver.status === "available" && "border-l-4 border-l-status-available",
          driver.status === "on-route" && "border-l-4 border-l-status-on-route",
          driver.status === "break" && "border-l-4 border-l-status-break",
          driver.status === "offline" && "border-l-4 border-l-status-offline opacity-60",
          isUpdated && "animate-row-flash"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="min-w-[120px] flex-1">
          <p className="text-sm font-medium text-foreground">{driver.name}</p>
          {driver.vehicle && (
            <p className="flex items-center gap-1 font-mono text-[10px] text-primary">
              <Truck className="h-2.5 w-2.5" />
              {driver.vehicle}
            </p>
          )}
        </div>

        {driver.status === "assigned" && driver.report_time && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{driver.report_time.slice(0, 5)}</span>
          </div>
        )}

        {driver.phone && (
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Phone className="h-3 w-3" />
            <span className="font-mono">{driver.phone}</span>
          </div>
        )}

        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                <StatusBadge status={driver.status} showPulse={driver.status !== "offline"} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              {(["punched-out", "offline", "off"].includes(driver.status) ? punchedOutStatusOptions : ["working", "on-route"].includes(driver.status) ? workingStatusOptions : driver.status === "assigned" ? assignedStatusOptions : statusOptions).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-xs",
                    driver.status === option.value && "bg-secondary"
                  )}
                >
                  <StatusBadge status={option.value} size="sm" />
                  <span className="ml-2">{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <StatusBadge status={driver.status} showPulse={driver.status !== "offline"} size="sm" />
        )}
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Assign {driver.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Either report time or vehicle is required.
          </p>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report-time-full">Report Time</Label>
              <Input
                id="report-time-full"
                type="time"
                value={reportTime}
                onChange={(e) => setReportTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vehicle-full">Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No vehicle</SelectItem>
                  {availableVehicles
                    .filter((v) => v.status === "active")
                    .map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.unit}>
                        {vehicle.unit} {vehicle.driver && vehicle.driver !== driver.name ? `(${vehicle.driver})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!canAssign}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}