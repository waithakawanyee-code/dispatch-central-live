import { useState } from "react";
import { User, Phone, Clock, Truck, Award, Home } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { AssignDriverDialog } from "./AssignDriverDialog";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  mini?: boolean;
  availableVehicles?: VehicleRowType[];
  isSelected?: boolean;
  onSelect?: (driverId: string) => void;
  isAnyHours?: boolean;
}

// New status workflow: unconfirmed → confirmed → on_the_clock → done
const unconfirmedStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "confirmed", label: "Confirm" },
];

const confirmedStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "on_the_clock", label: "Punch In" },
  { value: "unconfirmed", label: "Unconfirm" },
];

const onTheClockStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "done", label: "Punch Out" },
];

const doneStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "unconfirmed", label: "Reset to Unconfirmed" },
];

// Compact versions
const compactUnconfirmedOptions: { value: DriverStatus; label: string }[] = [
  { value: "confirmed", label: "Confirm" },
];

const compactConfirmedOptions: { value: DriverStatus; label: string }[] = [
  { value: "on_the_clock", label: "Punch In" },
  { value: "unconfirmed", label: "Unconfirm" },
];

const compactOnTheClockOptions: { value: DriverStatus; label: string }[] = [
  { value: "done", label: "Punch Out" },
];

const compactDoneOptions: { value: DriverStatus; label: string }[] = [
  { value: "unconfirmed", label: "Reset" },
];

export function DriverRow({ driver, onStatusChange, canEdit = true, isUpdated = false, compact = false, mini = false, availableVehicles = [], isSelected = false, onSelect, isAnyHours = false }: DriverRowProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [reportTime, setReportTime] = useState(driver.report_time?.slice(0, 5) || "");
  const [selectedVehicle, setSelectedVehicle] = useState(driver.vehicle || "__none__");


  // Get initial vehicle for assign dialog
  const getInitialVehicle = () => {
    const takeHomeVehicle = availableVehicles.find(
      v => (v as any).assigned_driver_id === driver.id && (v as any).classification === 'take_home'
    );
    const defaultVehicle = (driver as any).default_vehicle;
    return takeHomeVehicle?.unit || defaultVehicle || driver.vehicle || "__none__";
  };

  const handleStatusSelect = (status: DriverStatus) => {
    if (status === "confirmed") {
      setReportTime(driver.report_time?.slice(0, 5) || "");
      setSelectedVehicle(getInitialVehicle());
      setShowAssignDialog(true);
    } else {
      onStatusChange?.(status);
    }
  };


  const handleAssign = (assignReportTime: string | undefined, assignVehicle: string | undefined) => {
    onStatusChange?.("confirmed", assignReportTime, assignVehicle);
  };

  // Helper to get status options based on current status
  const getStatusOptions = () => {
    switch (driver.status) {
      case "done":
        return doneStatusOptions;
      case "on_the_clock":
        return onTheClockStatusOptions;
      case "confirmed":
        return confirmedStatusOptions;
      default:
        return unconfirmedStatusOptions;
    }
  };

  const getCompactStatusOptions = () => {
    switch (driver.status) {
      case "done":
        return compactDoneOptions;
      case "on_the_clock":
        return compactOnTheClockOptions;
      case "confirmed":
        return compactConfirmedOptions;
      default:
        return compactUnconfirmedOptions;
    }
  };

  // Mini view - very compact for high-density lists
  if (mini) {
    const handleMiniClick = () => {
      onSelect?.(driver.id);
    };

    const miniContent = (
      <div
        onClick={handleMiniClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-xs transition-all duration-200",
          "hover:border-primary/30",
          canEdit && "cursor-pointer",
          driver.status === "unconfirmed" && "border-slate-500/30",
          driver.status === "confirmed" && "border-emerald-500/30 bg-emerald-500/5",
          driver.status === "on_the_clock" && "border-status-available/30 bg-status-available/5",
          driver.status === "done" && "border-status-offline/30 opacity-70",
          isUpdated && "animate-row-flash",
          // Selection highlight
          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
        )}
      >
        {(driver as any).default_vehicle ? (
          <Home className="h-3 w-3 text-primary shrink-0" />
        ) : (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              driver.status === "unconfirmed" && "bg-slate-500",
              driver.status === "confirmed" && "bg-emerald-500",
              driver.status === "on_the_clock" && "bg-status-available",
              driver.status === "done" && "bg-status-offline"
            )}
          />
        )}
        <span className="font-mono font-medium text-foreground truncate max-w-[100px]">{driver.name}</span>
        {driver.has_cdl && (
          <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1 rounded">CDL</span>
        )}
      </div>
    );


    // Determine which options to show based on status
    const getMiniOptions = () => getCompactStatusOptions();

    if (canEdit) {
      return (
        <>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {miniContent}
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[140px]">
              {getMiniOptions().map((option) => (
                <ContextMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
                    driver.status === option.value && "bg-secondary"
                  )}
                >
                  <span>{option.label}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>

          <AssignDriverDialog
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            driverName={driver.name}
            initialReportTime={reportTime}
            initialVehicle={selectedVehicle}
            vehicles={availableVehicles}
            onConfirm={handleAssign}
          />

        </>
      );
    }

    return miniContent;
  }

  if (compact) {
    const content = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-all duration-200",
          "hover:border-primary/30",
          canEdit && "cursor-pointer",
          driver.status === "unconfirmed" && "border-l-4 border-l-slate-500",
          driver.status === "confirmed" && "border-l-4 border-l-emerald-500 bg-emerald-500/10",
          driver.status === "on_the_clock" && "border-l-4 border-l-status-available",
          driver.status === "done" && "border-l-4 border-l-status-offline opacity-60",
          isUpdated && "animate-row-flash"
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full shrink-0",
            driver.status === "unconfirmed" && "bg-slate-500",
            driver.status === "confirmed" && "bg-emerald-500",
            driver.status === "on_the_clock" && "bg-status-available",
            driver.status === "done" && "bg-status-offline"
          )}
        />
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-mono font-semibold text-foreground text-base">{driver.name}</span>
            {driver.has_cdl && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
            )}
            {isAnyHours && (
              <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title="Open to any shift">Any</span>
            )}
          </span>
          {/* Show phone for unconfirmed drivers */}
          {driver.status === "unconfirmed" && driver.phone && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {driver.phone}
            </span>
          )}
          {/* Show vehicle or report time for confirmed drivers */}
          {driver.status === "confirmed" && (
            <div className="flex items-center gap-3 text-xs">
              {driver.report_time && (
                <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {driver.report_time.slice(0, 5)}
                </span>
              )}
              {driver.vehicle && (
                <span className="flex items-center gap-1.5 font-mono text-primary">
                  <Truck className="h-3 w-3" />
                  {driver.vehicle}
                </span>
              )}
            </div>
          )}
          {/* Show vehicle for on_the_clock drivers */}
          {driver.status === "on_the_clock" && driver.vehicle && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-primary">
              <Truck className="h-3.5 w-3.5" />
              {driver.vehicle}
            </span>
          )}
        </div>
      </div>
    );

    if (canEdit) {
      return (
        <>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {content}
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[140px]">
              {getCompactStatusOptions().map((option) => (
                <ContextMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
                    driver.status === option.value && "bg-secondary"
                  )}
                >
                  <span>{option.label}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>

          <AssignDriverDialog
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            driverName={driver.name}
            initialReportTime={reportTime}
            initialVehicle={selectedVehicle}
            vehicles={availableVehicles}
            onConfirm={handleAssign}
          />

          <Dialog open={showPunchTimesDialog} onOpenChange={setShowPunchTimesDialog}>
            <DialogContent className="sm:max-w-[350px]">
              <DialogHeader>
                <DialogTitle>{driver.name} - Today's Punches</DialogTitle>
                <DialogDescription>
                  Punch in and out times for today
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {loadingPunches ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {punchTimes.length === 0 && !showAddPunch && (
                      <p className="text-sm text-muted-foreground text-center py-4">No punch records for today</p>
                    )}
                    {punchTimes.map((punch) => (
                      <div
                        key={punch.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-3",
                          punch.punch_type === "in" ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"
                        )}
                      >
                        <span className={cn(
                          "font-medium text-sm shrink-0",
                          punch.punch_type === "in" ? "text-emerald-600" : "text-destructive"
                        )}>
                          {punch.punch_type === "in" ? "Punch In" : "Punch Out"}
                        </span>
                        
                        {editingPunchId === punch.id ? (
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <Input
                              type="time"
                              value={editPunchTime}
                              onChange={(e) => setEditPunchTime(e.target.value)}
                              className="w-28 h-8 text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleSaveEdit(punch.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingPunchId(null);
                                setEditPunchTime("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-mono text-base font-semibold">
                              {new Date(punch.punch_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditPunch(punch)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeletePunch(punch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {showAddPunch ? (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                        <Select value={newPunchType} onValueChange={(v) => setNewPunchType(v as "in" | "out")}>
                          <SelectTrigger className="w-28 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in">Punch In</SelectItem>
                            <SelectItem value="out">Punch Out</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={newPunchTime}
                          onChange={(e) => setNewPunchTime(e.target.value)}
                          className="w-28 h-8 text-sm"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                          onClick={handleAddPunch}
                          disabled={!newPunchTime}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setShowAddPunch(false);
                            setNewPunchTime("");
                            setNewPunchType("in");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setShowAddPunch(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Punch
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {punchTimes.length > 0 && !loadingPunches && (
                <div className="border-t border-border pt-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Hours Worked</span>
                    <span className="font-mono font-bold text-lg text-foreground">
                      {(() => {
                        const { hours, minutes } = calculateTotalHours();
                        return `${hours}h ${minutes}m`;
                      })()}
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPunchTimesDialog(false)}>
                  Close
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
          driver.status === "unconfirmed" && "border-l-4 border-l-slate-500",
          driver.status === "confirmed" && "border-l-4 border-l-emerald-500",
          driver.status === "on_the_clock" && "border-l-4 border-l-status-available",
          driver.status === "done" && "border-l-4 border-l-status-offline opacity-60",
          isUpdated && "animate-row-flash"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="min-w-[120px] flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {driver.name}
            {(driver as any).default_vehicle && (
              <span title={`Take-home: ${(driver as any).default_vehicle}`}>
                <Home className="h-3.5 w-3.5 text-primary" />
              </span>
            )}
            {driver.has_cdl && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
            )}
          </p>
          {driver.vehicle && (
            <p className="flex items-center gap-1 font-mono text-[10px] text-primary">
              <Truck className="h-2.5 w-2.5" />
              {driver.vehicle}
            </p>
          )}
        </div>

        {driver.status === "confirmed" && driver.report_time && (
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
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                <StatusBadge status={driver.status} showPulse={driver.status !== "done"} size="sm" />
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-[140px]">
              {driver.status === "done" && (
                <ContextMenuItem
                  onClick={handleDoneClick}
                  className="cursor-pointer text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span>View Times</span>
                </ContextMenuItem>
              )}
              {getStatusOptions().map((option) => (
                <ContextMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
                    driver.status === option.value && "bg-secondary"
                  )}
                >
                  <StatusBadge status={option.value} size="sm" />
                  <span className="ml-2">{option.label}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <StatusBadge status={driver.status} showPulse={driver.status !== "done"} size="sm" />
        )}
      </div>

      <AssignDriverDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        driverName={driver.name}
        initialReportTime={reportTime}
        initialVehicle={selectedVehicle}
        vehicles={availableVehicles}
        onConfirm={handleAssign}
      />

      <Dialog open={showPunchTimesDialog} onOpenChange={setShowPunchTimesDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>{driver.name} - Today's Punches</DialogTitle>
            <DialogDescription>
              Punch in and out times for today
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingPunches ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-2">
                {punchTimes.length === 0 && !showAddPunch && (
                  <p className="text-sm text-muted-foreground text-center py-4">No punch records for today</p>
                )}
                {punchTimes.map((punch) => (
                  <div
                    key={punch.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3",
                      punch.punch_type === "in" ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"
                    )}
                  >
                    <span className={cn(
                      "font-medium text-sm shrink-0",
                      punch.punch_type === "in" ? "text-emerald-600" : "text-destructive"
                    )}>
                      {punch.punch_type === "in" ? "Punch In" : "Punch Out"}
                    </span>
                    
                    {editingPunchId === punch.id ? (
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <Input
                          type="time"
                          value={editPunchTime}
                          onChange={(e) => setEditPunchTime(e.target.value)}
                          className="w-28 h-8 text-sm"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleSaveEdit(punch.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingPunchId(null);
                            setEditPunchTime("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="font-mono text-base font-semibold">
                          {new Date(punch.punch_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEditPunch(punch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePunch(punch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {showAddPunch ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                    <Select value={newPunchType} onValueChange={(v) => setNewPunchType(v as "in" | "out")}>
                      <SelectTrigger className="w-28 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Punch In</SelectItem>
                        <SelectItem value="out">Punch Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={newPunchTime}
                      onChange={(e) => setNewPunchTime(e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      onClick={handleAddPunch}
                      disabled={!newPunchTime}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setShowAddPunch(false);
                        setNewPunchTime("");
                        setNewPunchType("in");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAddPunch(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Punch
                  </Button>
                )}
              </div>
            )}
          </div>
          {punchTimes.length > 0 && !loadingPunches && (
            <div className="border-t border-border pt-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Hours Worked</span>
                <span className="font-mono font-bold text-lg text-foreground">
                  {(() => {
                    const { hours, minutes } = calculateTotalHours();
                    return `${hours}h ${minutes}m`;
                  })()}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchTimesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
