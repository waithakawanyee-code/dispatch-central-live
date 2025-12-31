import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, UserCheck, UserX, Train, Stethoscope, Users, Eye, EyeOff, UserPlus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface Schedule {
  id: string;
  driver_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
}

interface ShuttleSchedule {
  id: string;
  driver_id: string;
  program: "amtrak" | "bph";
  day_of_week: number;
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
}

interface DriverWithSchedule {
  id: string;
  name: string;
  status: DriverStatus;
  schedule: Schedule | null;
  amtrak_trained?: boolean;
  amtrak_primary?: boolean;
  bph_trained?: boolean;
  bph_primary?: boolean;
}

interface DriverWithShuttleSchedule {
  id: string;
  name: string;
  status: DriverStatus;
  shuttleSchedules: ShuttleSchedule[];
  amtrak_trained?: boolean;
  amtrak_primary?: boolean;
  bph_trained?: boolean;
  bph_primary?: boolean;
}

const AMTRAK_SHIFTS = [
  { number: 1, label: "Shift 1", start: "03:00", end: "11:00" },
  { number: 2, label: "Shift 2", start: "11:00", end: "19:00" },
  { number: 3, label: "Shift 3", start: "19:00", end: "03:00" },
];

const schedulerStatusOptions: { value: DriverStatus; label: string; color: string }[] = [
  { value: "off", label: "Off", color: "text-muted-foreground" },
  { value: "scheduled", label: "Scheduled", color: "text-status-available" },
  { value: "assigned", label: "Assigned", color: "text-blue-500" },
  { value: "working", label: "Working", color: "text-status-on-route" },
];

const Scheduler = () => {
  const { drivers, updateDriverStatus } = useDispatchData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shuttleSchedules, setShuttleSchedules] = useState<ShuttleSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [scheduleTab, setScheduleTab] = useState<"all" | "black-car" | "amtrak" | "bph">("all");
  const [showTrainedCoverage, setShowTrainedCoverage] = useState(false);
  
  // BPH time editing state
  const [editingBphTimes, setEditingBphTimes] = useState(false);
  const [bphTempStartTime, setBphTempStartTime] = useState("08:00");
  const [bphTempEndTime, setBphTempEndTime] = useState("16:00");

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const fetchAllSchedules = async () => {
    setLoading(true);
    
    const [driverSchedulesRes, shuttleSchedulesRes] = await Promise.all([
      supabase.from("driver_schedules").select("*"),
      supabase.from("shuttle_schedules").select("*"),
    ]);

    if (!driverSchedulesRes.error && driverSchedulesRes.data) {
      setSchedules(driverSchedulesRes.data);
    }
    
    if (!shuttleSchedulesRes.error && shuttleSchedulesRes.data) {
      setShuttleSchedules(shuttleSchedulesRes.data as ShuttleSchedule[]);
    }
    
    setLoading(false);
  };

  // Assign driver to Amtrak shift
  const assignAmtrakShift = async (driverId: string | null, shiftNumber: number) => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    
    // First, remove any existing assignment for this shift on this day
    await supabase
      .from("shuttle_schedules")
      .delete()
      .eq("program", "amtrak")
      .eq("day_of_week", dayOfWeek)
      .eq("shift_number", shiftNumber);

    // If we're assigning a driver (not unassigning)
    if (driverId) {
      const shift = AMTRAK_SHIFTS.find(s => s.number === shiftNumber);
      const { error } = await supabase.from("shuttle_schedules").insert({
        driver_id: driverId,
        program: "amtrak",
        day_of_week: dayOfWeek,
        shift_number: shiftNumber,
        start_time: shift?.start || null,
        end_time: shift?.end || null,
      });

      if (error) {
        toast.error("Failed to assign driver");
        return;
      }
    }

    toast.success(driverId ? "Driver assigned to shift" : "Shift unassigned");
    fetchAllSchedules();
  };

  // Assign driver to BPH shift
  const assignBphShift = async (driverId: string | null, startTime: string, endTime: string) => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    
    // First, remove any existing BPH assignment for this day
    await supabase
      .from("shuttle_schedules")
      .delete()
      .eq("program", "bph")
      .eq("day_of_week", dayOfWeek);

    // If we're assigning a driver (not unassigning)
    if (driverId) {
      const { error } = await supabase.from("shuttle_schedules").insert({
        driver_id: driverId,
        program: "bph",
        day_of_week: dayOfWeek,
        shift_number: 1,
        start_time: startTime || null,
        end_time: endTime || null,
      });

      if (error) {
        toast.error("Failed to assign driver");
        return;
      }
    }

    toast.success(driverId ? "Driver assigned to BPH" : "BPH shift unassigned");
    fetchAllSchedules();
  };

  // Update BPH shift times
  const updateBphShiftTimes = async (startTime: string, endTime: string) => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    
    const { error } = await supabase
      .from("shuttle_schedules")
      .update({ start_time: startTime, end_time: endTime })
      .eq("program", "bph")
      .eq("day_of_week", dayOfWeek);

    if (error) {
      toast.error("Failed to update times");
      return;
    }

    toast.success("Shift times updated");
    fetchAllSchedules();
  };

  const handleStatusChange = async (driverId: string, newStatus: DriverStatus) => {
    await updateDriverStatus(driverId, newStatus);
    toast.success("Status updated");
  };

  const getStatusBadge = (status: DriverStatus) => {
    const option = schedulerStatusOptions.find(o => o.value === status);
    return option || { label: status, color: "text-muted-foreground" };
  };

  const getDayOfWeek = (date: Date) => date.getDay();

  const getDriversWithSchedules = (date: Date): DriverWithSchedule[] => {
    const dayOfWeek = getDayOfWeek(date);
    return drivers.map(driver => {
      const schedule = schedules.find(
        s => s.driver_id === driver.id && s.day_of_week === dayOfWeek
      );
      return {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        schedule: schedule || null,
        amtrak_trained: (driver as any).amtrak_trained,
        amtrak_primary: (driver as any).amtrak_primary,
        bph_trained: (driver as any).bph_trained,
        bph_primary: (driver as any).bph_primary,
      };
    });
  };

  const getDriversWithShuttleSchedules = (date: Date, program: "amtrak" | "bph"): DriverWithShuttleSchedule[] => {
    const dayOfWeek = getDayOfWeek(date);
    const relevantDrivers = drivers.filter(d => {
      if (program === "amtrak") return (d as any).amtrak_primary || (d as any).amtrak_trained;
      return (d as any).bph_primary || (d as any).bph_trained;
    });
    
    return relevantDrivers.map(driver => {
      const driverShuttleSchedules = shuttleSchedules.filter(
        s => s.driver_id === driver.id && s.program === program && s.day_of_week === dayOfWeek
      );
      return {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        shuttleSchedules: driverShuttleSchedules,
        amtrak_trained: (driver as any).amtrak_trained,
        amtrak_primary: (driver as any).amtrak_primary,
        bph_trained: (driver as any).bph_trained,
        bph_primary: (driver as any).bph_primary,
      };
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const goToNextDay = () => {
    const maxDate = addDays(startOfDay(new Date()), 7);
    if (selectedDate < maxDate) {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const isToday = isSameDay(selectedDate, new Date());
  const canGoBack = selectedDate > startOfDay(new Date());
  const canGoForward = selectedDate < addDays(startOfDay(new Date()), 6);

  const driversWithSchedules = getDriversWithSchedules(selectedDate);
  const amtrakDrivers = getDriversWithShuttleSchedules(selectedDate, "amtrak");
  const bphDrivers = getDriversWithShuttleSchedules(selectedDate, "bph");

  // Filter based on tab
  const filteredDrivers = useMemo(() => {
    let result = driversWithSchedules;
    
    if (scheduleTab === "black-car") {
      // Black car only: exclude primary shuttle drivers
      result = result.filter(d => !d.amtrak_primary && !d.bph_primary);
    } else if (scheduleTab === "amtrak") {
      // Amtrak primary drivers
      result = result.filter(d => d.amtrak_primary);
    } else if (scheduleTab === "bph") {
      // BPH primary drivers  
      result = result.filter(d => d.bph_primary);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(d => d.status === statusFilter);
    }
    
    return result;
  }, [driversWithSchedules, scheduleTab, statusFilter]);

  // Trained coverage drivers (for Amtrak/BPH tabs)
  const trainedCoverageDrivers = useMemo(() => {
    if (scheduleTab === "amtrak") {
      return driversWithSchedules.filter(d => d.amtrak_trained && !d.amtrak_primary);
    } else if (scheduleTab === "bph") {
      return driversWithSchedules.filter(d => d.bph_trained && !d.bph_primary);
    }
    return [];
  }, [driversWithSchedules, scheduleTab]);
  
  const availableDrivers = filteredDrivers.filter(d => d.schedule && !d.schedule.is_off);
  const offDrivers = filteredDrivers.filter(d => d.schedule?.is_off);
  const unscheduledDrivers = filteredDrivers.filter(d => !d.schedule);

  // Generate week days for quick navigation
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

  // Shuttle counts for tab badges
  const amtrakPrimaryCount = drivers.filter(d => (d as any).amtrak_primary).length;
  const bphPrimaryCount = drivers.filter(d => (d as any).bph_primary).length;

  const renderDriverRow = (driver: DriverWithSchedule, showScheduleTime = true) => (
    <div key={driver.id} className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {driver.name.charAt(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{driver.name}</span>
          {driver.amtrak_primary && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Train className="h-3 w-3 mr-0.5" />
              AMTRAK
            </Badge>
          )}
          {driver.amtrak_trained && !driver.amtrak_primary && (
            <Badge variant="outline" className="h-5 px-1 text-[10px] bg-blue-100 text-blue-500 border-blue-300" title="Amtrak Trained">
              <Train className="h-3 w-3" />
            </Badge>
          )}
          {driver.bph_primary && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
              <Stethoscope className="h-3 w-3 mr-0.5" />
              BPH
            </Badge>
          )}
          {driver.bph_trained && !driver.bph_primary && (
            <Badge variant="outline" className="h-5 px-1 text-[10px] bg-green-100 text-green-500 border-green-300" title="BPH Trained">
              <Stethoscope className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {showScheduleTime && driver.schedule && !driver.schedule.is_off && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(driver.schedule?.start_time)} - {formatTime(driver.schedule?.end_time)}
            </span>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "px-3 py-1 rounded-md text-xs font-medium border cursor-pointer",
              getStatusBadge(driver.status).color,
              "bg-secondary/50 border-border hover:bg-secondary"
            )}>
              {getStatusBadge(driver.status).label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {schedulerStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusChange(driver.id, option.value)}
                className={cn(
                  "cursor-pointer",
                  driver.status === option.value && "bg-secondary"
                )}
              >
                <span className={option.color}>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const renderAmtrakShifts = () => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    
    // Get all primary and trained Amtrak drivers for selection
    const amtrakEligibleDrivers = drivers.filter(d => 
      (d as any).amtrak_primary || (d as any).amtrak_trained
    );
    
    return (
      <div className="space-y-4">
        {AMTRAK_SHIFTS.map((shift) => {
          const shiftSchedule = shuttleSchedules.find(s => 
            s.program === "amtrak" && s.day_of_week === dayOfWeek && s.shift_number === shift.number
          );
          const assignedDriver = shiftSchedule 
            ? drivers.find(d => d.id === shiftSchedule.driver_id) 
            : null;
          
          // Check which drivers are already assigned to other shifts this day
          const assignedDriverIds = shuttleSchedules
            .filter(s => s.program === "amtrak" && s.day_of_week === dayOfWeek && s.shift_number !== shift.number)
            .map(s => s.driver_id);
          
          return (
            <div key={shift.number} className="rounded-lg border border-blue-200 bg-blue-50/50">
              <div className="border-b border-blue-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Train className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Amtrak – {shift.label}</span>
                </div>
                <span className="text-sm text-blue-600 font-mono">
                  {shift.start} – {shift.end}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Select
                      value={assignedDriver?.id || "__none__"}
                      onValueChange={(value) => assignAmtrakShift(value === "__none__" ? null : value, shift.number)}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        assignedDriver ? "border-blue-300 bg-white" : "border-dashed border-blue-300"
                      )}>
                        <SelectValue placeholder="Select driver..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground italic">Unassigned</span>
                        </SelectItem>
                        {amtrakEligibleDrivers.map((driver) => {
                          const isAssignedElsewhere = assignedDriverIds.includes(driver.id);
                          const isPrimary = (driver as any).amtrak_primary;
                          return (
                            <SelectItem 
                              key={driver.id} 
                              value={driver.id}
                              disabled={isAssignedElsewhere}
                            >
                              <div className="flex items-center gap-2">
                                <span className={isAssignedElsewhere ? "text-muted-foreground" : ""}>
                                  {driver.name}
                                </span>
                                {isPrimary ? (
                                  <Badge variant="outline" className="h-4 px-1 text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                    Primary
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="h-4 px-1 text-[9px] bg-blue-100 text-blue-500 border-blue-300">
                                    Trained
                                  </Badge>
                                )}
                                {isAssignedElsewhere && (
                                  <span className="text-xs text-muted-foreground">(assigned)</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {assignedDriver && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "px-3 py-1 rounded-md text-xs font-medium border cursor-pointer",
                          getStatusBadge(assignedDriver.status).color,
                          "bg-secondary/50 border-border hover:bg-secondary"
                        )}>
                          {getStatusBadge(assignedDriver.status).label}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        {schedulerStatusOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleStatusChange(assignedDriver.id, option.value)}
                          >
                            <span className={option.color}>{option.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBphShift = () => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    const bphSchedule = shuttleSchedules.find(s => 
      s.program === "bph" && s.day_of_week === dayOfWeek
    );
    const assignedDriver = bphSchedule 
      ? drivers.find(d => d.id === bphSchedule.driver_id) 
      : null;
    
    // Get all primary and trained BPH drivers for selection
    const bphEligibleDrivers = drivers.filter(d => 
      (d as any).bph_primary || (d as any).bph_trained
    );
    
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50">
        <div className="border-b border-green-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">BPH Shuttle</span>
          </div>
          {bphSchedule && !editingBphTimes && (
            <button 
              onClick={() => {
                setBphTempStartTime(bphSchedule.start_time || "08:00");
                setBphTempEndTime(bphSchedule.end_time || "16:00");
                setEditingBphTimes(true);
              }}
              className="text-sm text-green-600 font-mono hover:underline"
            >
              {formatTime(bphSchedule.start_time)} – {formatTime(bphSchedule.end_time)}
            </button>
          )}
          {!bphSchedule && (
            <span className="text-sm text-muted-foreground italic">Set times after assigning</span>
          )}
        </div>
        <div className="p-4 space-y-4">
          {/* Driver Selection */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Select
                value={assignedDriver?.id || "__none__"}
                onValueChange={(value) => {
                  const startTime = bphSchedule?.start_time || "08:00";
                  const endTime = bphSchedule?.end_time || "16:00";
                  assignBphShift(value === "__none__" ? null : value, startTime, endTime);
                }}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  assignedDriver ? "border-green-300 bg-white" : "border-dashed border-green-300"
                )}>
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground italic">Unassigned</span>
                  </SelectItem>
                  {bphEligibleDrivers.map((driver) => {
                    const isPrimary = (driver as any).bph_primary;
                    return (
                      <SelectItem key={driver.id} value={driver.id}>
                        <div className="flex items-center gap-2">
                          <span>{driver.name}</span>
                          {isPrimary ? (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-500/10 text-green-600 border-green-500/30">
                              Primary
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-100 text-green-500 border-green-300">
                              Trained
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {assignedDriver && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium border cursor-pointer",
                    getStatusBadge(assignedDriver.status).color,
                    "bg-secondary/50 border-border hover:bg-secondary"
                  )}>
                    {getStatusBadge(assignedDriver.status).label}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {schedulerStatusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusChange(assignedDriver.id, option.value)}
                    >
                      <span className={option.color}>{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Time Editing (only when assigned) */}
          {bphSchedule && editingBphTimes && (
            <div className="flex items-end gap-3 p-3 rounded-lg bg-white border border-green-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Time</Label>
                <Input
                  type="time"
                  value={bphTempStartTime}
                  onChange={(e) => setBphTempStartTime(e.target.value)}
                  className="h-9 w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End Time</Label>
                <Input
                  type="time"
                  value={bphTempEndTime}
                  onChange={(e) => setBphTempEndTime(e.target.value)}
                  className="h-9 w-32"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  updateBphShiftTimes(bphTempStartTime, bphTempEndTime);
                  setEditingBphTimes(false);
                }}
                className="gap-1"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingBphTimes(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Dispatch</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Driver Schedule
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {/* Date Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousDay}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextDay}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">
                {format(selectedDate, "EEEE, MMMM d")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isToday ? "Today" : format(selectedDate, "yyyy")}
              </p>
            </div>
          </div>

          {/* Week Day Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, index) => (
              <Button
                key={index}
                variant={isSameDay(day, selectedDate) ? "default" : "outline"}
                size="sm"
                className="min-w-[80px] flex-shrink-0"
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-center">
                  <div className="text-xs opacity-70">{format(day, "EEE")}</div>
                  <div className="font-semibold">{format(day, "d")}</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Schedule Type Tabs */}
          <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as typeof scheduleTab)} className="mt-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all" className="gap-2">
                All
              </TabsTrigger>
              <TabsTrigger value="black-car" className="gap-2">
                Black Car
              </TabsTrigger>
              <TabsTrigger value="amtrak" className="gap-2">
                <Train className="h-4 w-4" />
                Amtrak
                {amtrakPrimaryCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{amtrakPrimaryCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bph" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                BPH
                {bphPrimaryCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{bphPrimaryCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Show Trained Coverage Toggle (for shuttle tabs) */}
          {(scheduleTab === "amtrak" || scheduleTab === "bph") && trainedCoverageDrivers.length > 0 && (
            <Button
              variant={showTrainedCoverage ? "default" : "outline"}
              size="sm"
              className="mt-3 gap-2"
              onClick={() => setShowTrainedCoverage(!showTrainedCoverage)}
            >
              {showTrainedCoverage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <Users className="h-4 w-4" />
              {showTrainedCoverage ? "Hide" : "Show"} Trained Coverage ({trainedCoverageDrivers.length})
            </Button>
          )}

          {/* Status Legend & Filter - Sticky */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm mt-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">Filter:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 border-border hover:bg-secondary text-foreground"
              )}
            >
              All
            </button>
            {schedulerStatusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  statusFilter === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 border-border hover:bg-secondary"
                )}
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  option.value === "off" && "bg-status-offline",
                  option.value === "scheduled" && "bg-status-available",
                  option.value === "assigned" && "bg-blue-500",
                  option.value === "working" && "bg-status-on-route",
                  statusFilter === option.value && "ring-1 ring-white"
                )} />
                <span className={statusFilter === option.value ? "" : option.color}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Shuttle-specific views */}
            {scheduleTab === "amtrak" && (
              <>
                {renderAmtrakShifts()}
                
                {/* Trained Coverage Drivers */}
                {showTrainedCoverage && trainedCoverageDrivers.length > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/30">
                    <div className="border-b border-blue-100 bg-blue-100/50 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                        <Users className="h-4 w-4" />
                        Trained Backup Drivers ({trainedCoverageDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-blue-100">
                      {trainedCoverageDrivers.map(driver => renderDriverRow(driver, false))}
                    </div>
                  </div>
                )}
              </>
            )}

            {scheduleTab === "bph" && (
              <>
                {renderBphShift()}
                
                {/* Trained Coverage Drivers */}
                {showTrainedCoverage && trainedCoverageDrivers.length > 0 && (
                  <div className="rounded-lg border border-green-100 bg-green-50/30">
                    <div className="border-b border-green-100 bg-green-100/50 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-green-700">
                        <Users className="h-4 w-4" />
                        Trained Backup Drivers ({trainedCoverageDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-green-100">
                      {trainedCoverageDrivers.map(driver => renderDriverRow(driver, false))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regular schedule views (All & Black Car tabs) */}
            {(scheduleTab === "all" || scheduleTab === "black-car") && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-status-available">
                      <UserCheck className="h-5 w-5" />
                      <span className="font-semibold">{availableDrivers.length}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Scheduled</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-status-offline">
                      <UserX className="h-5 w-5" />
                      <span className="font-semibold">{offDrivers.length}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Day Off</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-5 w-5" />
                      <span className="font-semibold">{unscheduledDrivers.length}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Not Set</p>
                  </div>
                </div>

                {/* Available Drivers */}
                {availableDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border bg-status-available/10 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-status-available">
                        <UserCheck className="h-4 w-4" />
                        Scheduled Drivers ({availableDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border">
                      {availableDrivers.map(driver => renderDriverRow(driver))}
                    </div>
                  </div>
                )}

                {/* Off Drivers */}
                {offDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border bg-status-offline/10 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-status-offline">
                        <UserX className="h-4 w-4" />
                        Day Off ({offDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border">
                      {offDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-muted-foreground">{driver.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">Day Off</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className={cn(
                                  "px-3 py-1 rounded-md text-xs font-medium border cursor-pointer",
                                  getStatusBadge(driver.status).color,
                                  "bg-secondary/50 border-border hover:bg-secondary"
                                )}>
                                  {getStatusBadge(driver.status).label}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {schedulerStatusOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => handleStatusChange(driver.id, option.value)}
                                    className={cn(
                                      "cursor-pointer",
                                      driver.status === option.value && "bg-secondary"
                                    )}
                                  >
                                    <span className={option.color}>{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unscheduled Drivers */}
                {unscheduledDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card">
                    <div className="border-b border-border bg-secondary/50 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        No Schedule Set ({unscheduledDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border">
                      {unscheduledDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-muted-foreground">{driver.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground italic">Not scheduled</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className={cn(
                                  "px-3 py-1 rounded-md text-xs font-medium border cursor-pointer",
                                  getStatusBadge(driver.status).color,
                                  "bg-secondary/50 border-border hover:bg-secondary"
                                )}>
                                  {getStatusBadge(driver.status).label}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {schedulerStatusOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => handleStatusChange(driver.id, option.value)}
                                    className={cn(
                                      "cursor-pointer",
                                      driver.status === option.value && "bg-secondary"
                                    )}
                                  >
                                    <span className={option.color}>{option.label}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {filteredDrivers.length === 0 && scheduleTab !== "amtrak" && scheduleTab !== "bph" && (
              <div className="text-center py-12 text-muted-foreground">
                No drivers found for this view.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Scheduler;
