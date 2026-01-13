import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, UserCheck, UserX, Train, Stethoscope, Users, Eye, EyeOff, X, Save, Car } from "lucide-react";
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
  { value: "unconfirmed", label: "Unconfirmed", color: "text-muted-foreground" },
  { value: "confirmed", label: "Confirmed", color: "text-status-available" },
  { value: "on_the_clock", label: "On The Clock", color: "text-blue-500" },
  { value: "done", label: "Done", color: "text-status-on-route" },
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
    
    await supabase
      .from("shuttle_schedules")
      .delete()
      .eq("program", "amtrak")
      .eq("day_of_week", dayOfWeek)
      .eq("shift_number", shiftNumber);

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
    
    await supabase
      .from("shuttle_schedules")
      .delete()
      .eq("program", "bph")
      .eq("day_of_week", dayOfWeek);

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
      result = result.filter(d => !d.amtrak_primary && !d.bph_primary);
    } else if (scheduleTab === "amtrak") {
      result = result.filter(d => d.amtrak_primary);
    } else if (scheduleTab === "bph") {
      result = result.filter(d => d.bph_primary);
    }
    
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

  // Get shuttle coverage for selected day
  const dayOfWeek = getDayOfWeek(selectedDate);
  const dayShuttles = shuttleSchedules.filter(s => s.day_of_week === dayOfWeek);
  const amtrakShiftsForDay = dayShuttles.filter(s => s.program === "amtrak");
  const bphShiftForDay = dayShuttles.find(s => s.program === "bph");
  const isBphDay = dayOfWeek >= 1 && dayOfWeek <= 5;

  const renderDriverRow = (driver: DriverWithSchedule, showScheduleTime = true) => (
    <div key={driver.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary">
            {driver.name.charAt(0)}
          </span>
        </div>
        <span className="font-medium text-sm truncate">{driver.name}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {driver.amtrak_primary && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">
              <Train className="h-3 w-3" />
            </Badge>
          )}
          {driver.amtrak_trained && !driver.amtrak_primary && (
            <Train className="h-3 w-3 text-blue-400" />
          )}
          {driver.bph_primary && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
              <Stethoscope className="h-3 w-3" />
            </Badge>
          )}
          {driver.bph_trained && !driver.bph_primary && (
            <Stethoscope className="h-3 w-3 text-green-400" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showScheduleTime && driver.schedule && !driver.schedule.is_off && (
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(driver.schedule?.start_time)}–{formatTime(driver.schedule?.end_time)}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors",
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
    const amtrakEligibleDrivers = drivers.filter(d => 
      (d as any).amtrak_primary || (d as any).amtrak_trained
    );
    
    return (
      <div className="space-y-3">
        {AMTRAK_SHIFTS.map((shift) => {
          const shiftSchedule = shuttleSchedules.find(s => 
            s.program === "amtrak" && s.day_of_week === dayOfWeek && s.shift_number === shift.number
          );
          const assignedDriver = shiftSchedule 
            ? drivers.find(d => d.id === shiftSchedule.driver_id) 
            : null;
          
          const assignedDriverIds = shuttleSchedules
            .filter(s => s.program === "amtrak" && s.day_of_week === dayOfWeek && s.shift_number !== shift.number)
            .map(s => s.driver_id);
          
          return (
            <div key={shift.number} className="rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="border-b border-blue-500/20 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Train className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">{shift.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {shift.start}–{shift.end}
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <Select
                    value={assignedDriver?.id || "__none__"}
                    onValueChange={(value) => assignAmtrakShift(value === "__none__" ? null : value, shift.number)}
                  >
                    <SelectTrigger className={cn(
                      "flex-1 h-9",
                      assignedDriver ? "border-blue-500/30" : "border-dashed"
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
                                <Badge variant="outline" className="h-4 px-1 text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/30">
                                  Primary
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                                  Trained
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {assignedDriver && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer",
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
    const bphSchedule = shuttleSchedules.find(s => 
      s.program === "bph" && s.day_of_week === dayOfWeek
    );
    const assignedDriver = bphSchedule 
      ? drivers.find(d => d.id === bphSchedule.driver_id) 
      : null;
    
    const bphEligibleDrivers = drivers.filter(d => 
      (d as any).bph_primary || (d as any).bph_trained
    );
    
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5">
        <div className="border-b border-green-500/20 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">BPH Shuttle</span>
          </div>
          {bphSchedule && !editingBphTimes && (
            <button 
              onClick={() => {
                setBphTempStartTime(bphSchedule.start_time || "08:00");
                setBphTempEndTime(bphSchedule.end_time || "16:00");
                setEditingBphTimes(true);
              }}
              className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
            >
              {formatTime(bphSchedule.start_time)}–{formatTime(bphSchedule.end_time)}
            </button>
          )}
          {!bphSchedule && (
            <span className="text-xs text-muted-foreground italic">Assign to set times</span>
          )}
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-3">
            <Select
              value={assignedDriver?.id || "__none__"}
              onValueChange={(value) => {
                const startTime = bphSchedule?.start_time || "08:00";
                const endTime = bphSchedule?.end_time || "16:00";
                assignBphShift(value === "__none__" ? null : value, startTime, endTime);
              }}
            >
              <SelectTrigger className={cn(
                "flex-1 h-9",
                assignedDriver ? "border-green-500/30" : "border-dashed"
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
                          <Badge variant="outline" className="h-4 px-1 text-[9px] bg-green-500/10 text-green-500 border-green-500/30">
                            Primary
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                            Trained
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {assignedDriver && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer",
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

          {bphSchedule && editingBphTimes && (
            <div className="flex items-end gap-2 p-2.5 rounded bg-card border border-green-500/20">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Start</Label>
                <Input
                  type="time"
                  value={bphTempStartTime}
                  onChange={(e) => setBphTempStartTime(e.target.value)}
                  className="h-8 w-28 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase">End</Label>
                <Input
                  type="time"
                  value={bphTempEndTime}
                  onChange={(e) => setBphTempEndTime(e.target.value)}
                  className="h-8 w-28 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  updateBphShiftTimes(bphTempStartTime, bphTempEndTime);
                  setEditingBphTimes(false);
                }}
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => setEditingBphTimes(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Dispatch</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Schedule
            </h1>
          </div>
          <Link to="/shuttle-schedules">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Train className="h-4 w-4" />
              <span className="hidden sm:inline">Shuttles</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {/* Date Navigation - Consolidated */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay} disabled={!canGoBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay} disabled={!canGoForward}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToToday}>
                  Today
                </Button>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold leading-tight">
                {format(selectedDate, "EEEE, MMM d")}
              </h2>
              {isToday && <span className="text-xs text-primary font-medium">Today</span>}
            </div>
          </div>

          {/* Week Pills */}
          <div className="flex gap-1.5 mb-3">
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-center transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card border border-border hover:border-primary/50"
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide opacity-70">{format(day, "EEE")}</div>
                  <div className="text-sm font-semibold">{format(day, "d")}</div>
                </button>
              );
            })}
          </div>

          {/* Shuttle Summary - Inline */}
          {(amtrakShiftsForDay.length > 0 || bphShiftForDay || isBphDay) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-3">
              {AMTRAK_SHIFTS.map((shift) => {
                const schedule = amtrakShiftsForDay.find(s => s.shift_number === shift.number);
                const driver = schedule ? drivers.find(d => d.id === schedule.driver_id) : null;
                return (
                  <div key={shift.number} className="flex items-center gap-1.5">
                    <Train className="h-3 w-3 text-blue-500" />
                    <span className="font-mono">{shift.start.slice(0,2)}-{shift.end.slice(0,2)}</span>
                    <span className={driver ? "font-medium text-foreground" : "italic opacity-50"}>
                      {driver ? driver.name.split(' ')[0] : "—"}
                    </span>
                  </div>
                );
              })}
              {isBphDay && (
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3 w-3 text-green-500" />
                  <span className="font-mono">
                    {bphShiftForDay ? `${formatTime(bphShiftForDay.start_time).slice(0,2)}-${formatTime(bphShiftForDay.end_time).slice(0,2)}` : "BPH"}
                  </span>
                  <span className={bphShiftForDay ? "font-medium text-foreground" : "italic opacity-50"}>
                    {bphShiftForDay ? drivers.find(d => d.id === bphShiftForDay.driver_id)?.name.split(' ')[0] || "—" : "—"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as typeof scheduleTab)}>
            <TabsList className="h-9 p-1">
              <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
              <TabsTrigger value="black-car" className="text-xs h-7 px-3 gap-1.5">
                <Car className="h-3.5 w-3.5" />
                Above All
              </TabsTrigger>
              <TabsTrigger value="amtrak" className="text-xs h-7 px-3 gap-1.5">
                <Train className="h-3.5 w-3.5" />
                Amtrak
                {amtrakPrimaryCount > 0 && (
                  <span className="ml-1 px-1.5 rounded-full bg-blue-500/20 text-blue-500 text-[10px]">{amtrakPrimaryCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="bph" className="text-xs h-7 px-3 gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                BPH
                {bphPrimaryCount > 0 && (
                  <span className="ml-1 px-1.5 rounded-full bg-green-500/20 text-green-500 text-[10px]">{bphPrimaryCount}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap",
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
              )}
            >
              All
            </button>
            {schedulerStatusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap",
                  statusFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  option.value === "unconfirmed" && "bg-muted-foreground",
                  option.value === "confirmed" && "bg-status-available",
                  option.value === "on_the_clock" && "bg-blue-500",
                  option.value === "done" && "bg-status-on-route"
                )} />
                {option.label}
              </button>
            ))}
          </div>

          {/* Trained Coverage Toggle */}
          {(scheduleTab === "amtrak" || scheduleTab === "bph") && trainedCoverageDrivers.length > 0 && (
            <Button
              variant={showTrainedCoverage ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5 flex-shrink-0"
              onClick={() => setShowTrainedCoverage(!showTrainedCoverage)}
            >
              {showTrainedCoverage ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Backup ({trainedCoverageDrivers.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shuttle-specific views */}
            {scheduleTab === "amtrak" && (
              <>
                {renderAmtrakShifts()}
                {showTrainedCoverage && trainedCoverageDrivers.length > 0 && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5">
                    <div className="border-b border-blue-500/20 px-3 py-2">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        Backup Drivers
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {trainedCoverageDrivers.map(driver => renderDriverRow(driver, false))}
                    </div>
                  </div>
                )}
              </>
            )}

            {scheduleTab === "bph" && (
              <>
                {renderBphShift()}
                {showTrainedCoverage && trainedCoverageDrivers.length > 0 && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5">
                    <div className="border-b border-green-500/20 px-3 py-2">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        Backup Drivers
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {trainedCoverageDrivers.map(driver => renderDriverRow(driver, false))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regular schedule views (All & Black Car tabs) */}
            {(scheduleTab === "all" || scheduleTab === "black-car") && (
              <>
                {/* Compact Stats */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-status-available/10 text-status-available">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span className="font-semibold">{availableDrivers.length}</span>
                    <span className="text-muted-foreground">scheduled</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground">
                    <UserX className="h-3.5 w-3.5" />
                    <span className="font-semibold">{offDrivers.length}</span>
                    <span>off</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-semibold">{unscheduledDrivers.length}</span>
                    <span>unset</span>
                  </div>
                </div>

                {/* Available Drivers */}
                {availableDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="border-b border-border bg-status-available/5 px-3 py-2">
                      <h3 className="font-medium text-sm flex items-center gap-2 text-status-available">
                        <UserCheck className="h-4 w-4" />
                        Scheduled ({availableDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {availableDrivers.map(driver => renderDriverRow(driver))}
                    </div>
                  </div>
                )}

                {/* Off Drivers */}
                {offDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="border-b border-border bg-muted/50 px-3 py-2">
                      <h3 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <UserX className="h-4 w-4" />
                        Day Off ({offDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {offDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-sm text-muted-foreground">{driver.name}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={cn(
                                "px-2.5 py-1 rounded text-xs font-medium border cursor-pointer",
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
                                  className={cn("cursor-pointer", driver.status === option.value && "bg-secondary")}
                                >
                                  <span className={option.color}>{option.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unscheduled Drivers */}
                {unscheduledDrivers.length > 0 && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="border-b border-border bg-muted/30 px-3 py-2">
                      <h3 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        No Schedule ({unscheduledDrivers.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {unscheduledDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-sm text-muted-foreground">{driver.name}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={cn(
                                "px-2.5 py-1 rounded text-xs font-medium border cursor-pointer",
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
                                  className={cn("cursor-pointer", driver.status === option.value && "bg-secondary")}
                                >
                                  <span className={option.color}>{option.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {filteredDrivers.length === 0 && scheduleTab !== "amtrak" && scheduleTab !== "bph" && (
              <div className="text-center py-12 text-muted-foreground text-sm">
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
