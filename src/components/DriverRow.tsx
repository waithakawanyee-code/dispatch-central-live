import { useState } from "react";
import { User, Phone, Clock, Truck, Pencil, Trash2, Check, X, Plus, Award } from "lucide-react";
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
}

// Workflow: Unassigned → Assigned → Working → Punched Out
// Unassigned drivers get: Assign or OFF
const unassignedStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "assigned", label: "Assign" },
  { value: "off", label: "OFF" },
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

const compactUnassignedOptions: { value: DriverStatus; label: string }[] = [
  { value: "assigned", label: "Assign" },
  { value: "off", label: "OFF" },
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

interface TimePunch {
  id: string;
  punch_type: string;
  punch_time: string;
}

export function DriverRow({ driver, onStatusChange, canEdit = true, isUpdated = false, compact = false, mini = false, availableVehicles = [] }: DriverRowProps) {
  const { toast } = useToast();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showOffDialog, setShowOffDialog] = useState(false);
  const [showPunchTimesDialog, setShowPunchTimesDialog] = useState(false);
  const [punchTimes, setPunchTimes] = useState<TimePunch[]>([]);
  const [loadingPunches, setLoadingPunches] = useState(false);
  const [editingPunchId, setEditingPunchId] = useState<string | null>(null);
  const [editPunchTime, setEditPunchTime] = useState("");
  const [showAddPunch, setShowAddPunch] = useState(false);
  const [newPunchType, setNewPunchType] = useState<"in" | "out">("in");
  const [newPunchTime, setNewPunchTime] = useState("");
  const [reportTime, setReportTime] = useState(driver.report_time?.slice(0, 5) || "");
  const [selectedVehicle, setSelectedVehicle] = useState(driver.vehicle || "__none__");
  const [isCallOut, setIsCallOut] = useState(false);
  const [callOutNote, setCallOutNote] = useState("");

  // Calculate total hours worked from punch pairs
  const calculateTotalHours = () => {
    let totalMinutes = 0;
    const sortedPunches = [...punchTimes].sort((a, b) => 
      new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
    );
    
    let punchInTime: Date | null = null;
    
    for (const punch of sortedPunches) {
      if (punch.punch_type === "in") {
        punchInTime = new Date(punch.punch_time);
      } else if (punch.punch_type === "out" && punchInTime) {
        const punchOutTime = new Date(punch.punch_time);
        totalMinutes += (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60);
        punchInTime = null;
      }
    }
    
    // If still punched in, calculate time until now
    if (punchInTime) {
      totalMinutes += (new Date().getTime() - punchInTime.getTime()) / (1000 * 60);
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return { hours, minutes, totalMinutes };
  };

  const fetchPunchTimes = async () => {
    setLoadingPunches(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("time_punches")
      .select("id, punch_type, punch_time")
      .eq("driver_id", driver.id)
      .gte("punch_time", `${today}T00:00:00`)
      .lte("punch_time", `${today}T23:59:59`)
      .order("punch_time", { ascending: true });

    if (!error && data) {
      setPunchTimes(data);
    }
    setLoadingPunches(false);
    setShowPunchTimesDialog(true);
  };

  const handleEditPunch = (punch: TimePunch) => {
    setEditingPunchId(punch.id);
    const time = new Date(punch.punch_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setEditPunchTime(time);
  };

  const handleSaveEdit = async (punchId: string) => {
    if (!editPunchTime) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newPunchTime = `${today}T${editPunchTime}:00`;
    
    const { error } = await supabase
      .from("time_punches")
      .update({ punch_time: newPunchTime })
      .eq("id", punchId);

    if (error) {
      toast({
        title: "Error updating punch time",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Punch time updated",
        description: "The punch time has been updated successfully",
      });
      // Refresh punch times
      setPunchTimes(punchTimes.map(p => 
        p.id === punchId ? { ...p, punch_time: newPunchTime } : p
      ));
    }
    setEditingPunchId(null);
    setEditPunchTime("");
  };

  const handleDeletePunch = async (punchId: string) => {
    const { error } = await supabase
      .from("time_punches")
      .delete()
      .eq("id", punchId);

    if (error) {
      toast({
        title: "Error deleting punch",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Punch deleted",
        description: "The punch record has been deleted",
      });
      setPunchTimes(punchTimes.filter(p => p.id !== punchId));
    }
  };

  const handleAddPunch = async () => {
    if (!newPunchTime) return;
    
    const today = new Date().toISOString().split('T')[0];
    const punchTime = `${today}T${newPunchTime}:00`;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("time_punches")
      .insert({
        driver_id: driver.id,
        driver_name: driver.name,
        punch_type: newPunchType,
        punch_time: punchTime,
        punched_by: user?.id || null,
      })
      .select("id, punch_type, punch_time")
      .single();

    if (error) {
      toast({
        title: "Error adding punch",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      toast({
        title: "Punch added",
        description: `${newPunchType === "in" ? "Punch in" : "Punch out"} recorded`,
      });
      // Add to list and sort by time
      const updatedPunches = [...punchTimes, data].sort((a, b) => 
        new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
      );
      setPunchTimes(updatedPunches);
      setShowAddPunch(false);
      setNewPunchTime("");
      setNewPunchType("in");
    }
  };

  const handleStatusSelect = (status: DriverStatus) => {
    if (status === "assigned") {
      setReportTime(driver.report_time?.slice(0, 5) || "");
      setSelectedVehicle(driver.vehicle || "__none__");
      setShowAssignDialog(true);
    } else if (status === "off") {
      setIsCallOut(false);
      setCallOutNote("");
      setShowOffDialog(true);
    } else {
      onStatusChange?.(status);
    }
  };

  const handlePunchedOutClick = () => {
    if (["punched-out", "offline"].includes(driver.status)) {
      fetchPunchTimes();
    }
  };

  const vehicleValue = selectedVehicle === "__none__" ? undefined : selectedVehicle;
  const canAssign = reportTime.trim() !== "" || vehicleValue !== undefined;

  const handleAssign = () => {
    if (!canAssign) return;
    onStatusChange?.("assigned", reportTime || undefined, vehicleValue);
    setShowAssignDialog(false);
  };

  const handleConfirmOff = async () => {
    // If it's a call out, record it
    if (isCallOut) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("call_outs").insert({
        driver_id: driver.id,
        driver_name: driver.name,
        note: callOutNote.trim() || null,
        created_by: user?.id || null,
      });

      if (error) {
        toast({
          title: "Error recording call out",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Call out recorded",
          description: `${driver.name} marked as called out`,
        });
      }
    }

    onStatusChange?.("off");
    setShowOffDialog(false);
    setIsCallOut(false);
    setCallOutNote("");
  };

  // Mini view - very compact for high-density lists
  if (mini) {
    const miniContent = (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-xs transition-all duration-200",
          "hover:border-primary/30",
          canEdit && "cursor-pointer",
          driver.status === "unassigned" && "border-slate-500/30",
          driver.status === "scheduled" && "border-amber-500/30 bg-amber-500/5",
          driver.status === "assigned" && "border-emerald-500/30 bg-emerald-500/5",
          ["working", "on-route"].includes(driver.status) && "border-status-available/30 bg-status-available/5",
          ["offline", "punched-out"].includes(driver.status) && "border-status-offline/30 opacity-70",
          isUpdated && "animate-row-flash"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            driver.status === "scheduled" && "bg-amber-500",
            driver.status === "unassigned" && "bg-slate-500",
            driver.status === "assigned" && "bg-emerald-500",
            ["working", "on-route"].includes(driver.status) && "bg-status-available",
            ["offline", "punched-out"].includes(driver.status) && "bg-status-offline"
          )}
        />
        <span className="font-mono font-medium text-foreground truncate max-w-[100px]">{driver.name}</span>
        {driver.has_cdl && (
          <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1 rounded">CDL</span>
        )}
      </div>
    );

    // Determine which options to show based on status
    const getMiniOptions = () => {
      if (["punched-out", "offline", "off"].includes(driver.status)) return compactPunchedOutOptions;
      if (["working", "on-route"].includes(driver.status)) return compactWorkingOptions;
      if (driver.status === "assigned") return compactAssignedOptions;
      return compactUnassignedOptions;
    };

    if (canEdit) {
      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {miniContent}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {["punched-out", "offline"].includes(driver.status) && (
                <DropdownMenuItem
                  onClick={handlePunchedOutClick}
                  className="cursor-pointer text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span>View Times</span>
                </DropdownMenuItem>
              )}
              {getMiniOptions().map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
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
                  <Label htmlFor="report-time-mini">Report Time</Label>
                  <Input
                    id="report-time-mini"
                    type="time"
                    value={reportTime}
                    onChange={(e) => setReportTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle-mini">Vehicle</Label>
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

          <Dialog open={showOffDialog} onOpenChange={setShowOffDialog}>
            <DialogContent className="sm:max-w-[350px]">
              <DialogHeader>
                <DialogTitle>Mark {driver.name} as OFF</DialogTitle>
                <DialogDescription>
                  Did the driver call out?
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="call-out-mini"
                    checked={isCallOut}
                    onCheckedChange={(checked) => setIsCallOut(checked === true)}
                  />
                  <Label htmlFor="call-out-mini" className="text-sm font-normal">
                    Yes, driver called out
                  </Label>
                </div>
                {isCallOut && (
                  <div className="grid gap-2">
                    <Label htmlFor="call-out-note-mini">Note (optional)</Label>
                    <Textarea
                      id="call-out-note-mini"
                      placeholder="Reason for call out..."
                      value={callOutNote}
                      onChange={(e) => setCallOutNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOffDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmOff}>
                  Confirm OFF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

    return miniContent;
  }

  if (compact) {
    const content = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-all duration-200",
          "hover:border-primary/30",
          canEdit && "cursor-pointer",
          driver.status === "available" && "border-l-4 border-l-status-available",
          driver.status === "on-route" && "border-l-4 border-l-status-on-route",
          driver.status === "break" && "border-l-4 border-l-status-break",
          driver.status === "offline" && "border-l-4 border-l-status-offline opacity-60",
          driver.status === "off" && "border-l-4 border-l-status-offline opacity-60",
          driver.status === "scheduled" && "border-l-4 border-l-amber-500 bg-amber-500/10",
          driver.status === "assigned" && "border-l-4 border-l-emerald-500 bg-emerald-500/10",
          driver.status === "working" && "border-l-4 border-l-status-available",
          isUpdated && "animate-row-flash"
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full shrink-0",
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
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="font-mono font-semibold text-foreground text-base">{driver.name}</span>
          {/* Show phone for unassigned/scheduled drivers */}
          {(driver.status === "unassigned" || driver.status === "scheduled") && driver.phone && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {driver.phone}
            </span>
          )}
          {/* Show vehicle or report time for assigned drivers */}
          {driver.status === "assigned" && (
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
          {/* Show vehicle for working drivers */}
          {["working", "on-route"].includes(driver.status) && driver.vehicle && (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {content}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {["punched-out", "offline"].includes(driver.status) && (
                <DropdownMenuItem
                  onClick={handlePunchedOutClick}
                  className="cursor-pointer text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span>View Times</span>
                </DropdownMenuItem>
              )}
              {(["punched-out", "offline", "off"].includes(driver.status) ? compactPunchedOutOptions : ["working", "on-route"].includes(driver.status) ? compactWorkingOptions : driver.status === "assigned" ? compactAssignedOptions : compactUnassignedOptions).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
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

          <Dialog open={showOffDialog} onOpenChange={setShowOffDialog}>
            <DialogContent className="sm:max-w-[350px]">
              <DialogHeader>
                <DialogTitle>Mark {driver.name} as OFF</DialogTitle>
                <DialogDescription>
                  Did the driver call out?
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="call-out-compact"
                    checked={isCallOut}
                    onCheckedChange={(checked) => setIsCallOut(checked === true)}
                  />
                  <Label htmlFor="call-out-compact" className="text-sm font-normal">
                    Yes, driver called out
                  </Label>
                </div>
                {isCallOut && (
                  <div className="grid gap-2">
                    <Label htmlFor="call-out-note-compact">Note (optional)</Label>
                    <Textarea
                      id="call-out-note-compact"
                      placeholder="Reason for call out..."
                      value={callOutNote}
                      onChange={(e) => setCallOutNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOffDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmOff}>
                  Confirm OFF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {["punched-out", "offline"].includes(driver.status) && (
                <DropdownMenuItem
                  onClick={handlePunchedOutClick}
                  className="cursor-pointer text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span>View Times</span>
                </DropdownMenuItem>
              )}
              {(["punched-out", "offline", "off"].includes(driver.status) ? punchedOutStatusOptions : ["working", "on-route"].includes(driver.status) ? workingStatusOptions : driver.status === "assigned" ? assignedStatusOptions : unassignedStatusOptions).map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={cn(
                    "cursor-pointer text-sm",
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

      <Dialog open={showOffDialog} onOpenChange={setShowOffDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Mark {driver.name} as OFF</DialogTitle>
            <DialogDescription>
              Did the driver call out?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="call-out-full"
                checked={isCallOut}
                onCheckedChange={(checked) => setIsCallOut(checked === true)}
              />
              <Label htmlFor="call-out-full" className="text-sm font-normal">
                Yes, driver called out
              </Label>
            </div>
            {isCallOut && (
              <div className="grid gap-2">
                <Label htmlFor="call-out-note-full">Note (optional)</Label>
                <Textarea
                  id="call-out-note-full"
                  placeholder="Reason for call out..."
                  value={callOutNote}
                  onChange={(e) => setCallOutNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmOff}>
              Confirm OFF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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