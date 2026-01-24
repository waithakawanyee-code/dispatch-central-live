import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, UserCheck, UserX, Train, Stethoscope, Users, Eye, EyeOff, X, Save, Car, Sparkles, PhoneOff, MoreHorizontal, UserMinus } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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

const schedulerStatusOptions: { value: DriverStatus; label: string; color: string; bgColor: string }[] = [
  { value: "unconfirmed", label: "Unconfirmed", color: "text-muted-foreground", bgColor: "bg-muted/50" },
  { value: "confirmed", label: "Confirmed", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  { value: "on_the_clock", label: "On The Clock", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  { value: "done", label: "Done", color: "text-violet-400", bgColor: "bg-violet-500/10" },
];

const shuttleStatusOptions: { value: DriverStatus; label: string; color: string; bgColor: string }[] = [
  { value: "unconfirmed", label: "Unconfirmed", color: "text-muted-foreground", bgColor: "bg-muted/50" },
  { value: "confirmed", label: "Confirmed", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
];

const Scheduler = () => {
  const { user } = useAuth();
  const { drivers, updateDriverStatus } = useDispatchData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shuttleSchedules, setShuttleSchedules] = useState<ShuttleSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [scheduleTab, setScheduleTab] = useState<"all" | "black-car" | "shuttles">("all");
  const [showTrainedCoverage, setShowTrainedCoverage] = useState(false);
  
  const [editingBphTimes, setEditingBphTimes] = useState(false);
  const [bphTempStartTime, setBphTempStartTime] = useState("08:00");
  const [bphTempEndTime, setBphTempEndTime] = useState("16:00");

  // Mark Off Dialog state
  const [showMarkOffDialog, setShowMarkOffDialog] = useState(false);
  const [markOffDriver, setMarkOffDriver] = useState<{ id: string; name: string } | null>(null);
  const [isCallOut, setIsCallOut] = useState(false);
  const [callOutNote, setCallOutNote] = useState("");
  const [markingOff, setMarkingOff] = useState(false);

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

  // Open mark off dialog
  const openMarkOffDialog = (driverId: string, driverName: string) => {
    setMarkOffDriver({ id: driverId, name: driverName });
    setIsCallOut(false);
    setCallOutNote("");
    setShowMarkOffDialog(true);
  };

  // Handle marking driver as off
  const handleMarkOff = async () => {
    if (!markOffDriver) return;
    
    setMarkingOff(true);
    const dayOfWeek = getDayOfWeek(selectedDate);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Check if schedule exists for this day
      const existingSchedule = schedules.find(
        s => s.driver_id === markOffDriver.id && s.day_of_week === dayOfWeek
      );

      if (existingSchedule) {
        // Update existing schedule to mark as off
        const { error } = await supabase
          .from("driver_schedules")
          .update({ is_off: true, start_time: null, end_time: null })
          .eq("id", existingSchedule.id);

        if (error) throw error;
      } else {
        // Create new schedule entry marked as off
        const { error } = await supabase
          .from("driver_schedules")
          .insert({
            driver_id: markOffDriver.id,
            day_of_week: dayOfWeek,
            is_off: true,
            start_time: null,
            end_time: null,
          });

        if (error) throw error;
      }

      // If it's a call out, record it
      if (isCallOut) {
        await supabase.from("call_outs").insert({
          driver_id: markOffDriver.id,
          driver_name: markOffDriver.name,
          call_out_date: dateStr,
          note: callOutNote.trim() || null,
          created_by: user?.id || null,
        });
      }

      toast.success(`${markOffDriver.name} marked as off for ${format(selectedDate, "EEEE")}`);
      setShowMarkOffDialog(false);
      fetchAllSchedules();
    } catch (error) {
      toast.error("Failed to mark driver as off");
    } finally {
      setMarkingOff(false);
    }
  };

  // Handle restoring driver from off status
  const handleRestoreFromOff = async (driverId: string, driverName: string) => {
    const dayOfWeek = getDayOfWeek(selectedDate);
    const existingSchedule = schedules.find(
      s => s.driver_id === driverId && s.day_of_week === dayOfWeek
    );

    if (!existingSchedule) return;

    const { error } = await supabase
      .from("driver_schedules")
      .update({ is_off: false })
      .eq("id", existingSchedule.id);

    if (error) {
      toast.error("Failed to restore driver");
      return;
    }

    // Also remove any call-out record for this date
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    await supabase
      .from("call_outs")
      .delete()
      .eq("driver_id", driverId)
      .eq("call_out_date", dateStr);

    toast.success(`${driverName} restored for ${format(selectedDate, "EEEE")}`);
    fetchAllSchedules();
  };

  const getStatusBadge = (status: DriverStatus) => {
    const option = schedulerStatusOptions.find(o => o.value === status);
    return option || { label: status, color: "text-muted-foreground", bgColor: "bg-muted/50" };
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

  const filteredDrivers = useMemo(() => {
    let result = driversWithSchedules;
    
    if (scheduleTab === "black-car") {
      result = result.filter(d => !d.amtrak_primary && !d.bph_primary);
    } else if (scheduleTab === "shuttles") {
      result = result.filter(d => d.amtrak_primary || d.bph_primary);
    }
    
    if (statusFilter !== "all") {
      result = result.filter(d => d.status === statusFilter);
    }
    
    return result;
  }, [driversWithSchedules, scheduleTab, statusFilter]);

  const trainedCoverageDrivers = useMemo(() => {
    if (scheduleTab === "shuttles") {
      return driversWithSchedules.filter(d => 
        (d.amtrak_trained && !d.amtrak_primary) || (d.bph_trained && !d.bph_primary)
      );
    }
    return [];
  }, [driversWithSchedules, scheduleTab]);
  
  const availableDrivers = filteredDrivers
    .filter(d => d.schedule && !d.schedule.is_off)
    .sort((a, b) => {
      const timeA = a.schedule?.start_time || "99:99";
      const timeB = b.schedule?.start_time || "99:99";
      return timeA.localeCompare(timeB);
    });
  const offDrivers = filteredDrivers.filter(d => d.schedule?.is_off);
  const unscheduledDrivers = filteredDrivers.filter(d => !d.schedule);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));
  const shuttlePrimaryCount = drivers.filter(d => (d as any).amtrak_primary || (d as any).bph_primary).length;

  const dayOfWeek = getDayOfWeek(selectedDate);
  const dayShuttles = shuttleSchedules.filter(s => s.day_of_week === dayOfWeek);
  const amtrakShiftsForDay = dayShuttles.filter(s => s.program === "amtrak");
  const bphShiftForDay = dayShuttles.find(s => s.program === "bph");
  const isBphDay = dayOfWeek >= 1 && dayOfWeek <= 5;

  const renderDriverRow = (driver: DriverWithSchedule, showScheduleTime = true) => {
    const statusBadge = getStatusBadge(driver.status);
    
    return (
      <div 
        key={driver.id} 
        className="group flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
              <span className="text-sm font-semibold text-primary">
                {driver.name.charAt(0)}
              </span>
            </div>
            {driver.status === "on_the_clock" && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-card animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-sm block truncate">{driver.name}</span>
            {showScheduleTime && driver.schedule && !driver.schedule.is_off && (
              <span className="text-xs font-mono text-muted-foreground">
                {formatTime(driver.schedule?.start_time)}–{formatTime(driver.schedule?.end_time)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {driver.amtrak_primary && (
              <div className="h-6 px-2 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1">
                <Train className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400">AMT</span>
              </div>
            )}
            {driver.amtrak_trained && !driver.amtrak_primary && (
              <Train className="h-3.5 w-3.5 text-blue-400/60" />
            )}
            {driver.bph_primary && (
              <div className="h-6 px-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                <Stethoscope className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">BPH</span>
              </div>
            )}
            {driver.bph_trained && !driver.bph_primary && (
              <Stethoscope className="h-3.5 w-3.5 text-emerald-400/60" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                statusBadge.color,
                statusBadge.bgColor,
                "border border-transparent hover:border-primary/20 hover:shadow-sm"
              )}>
                {statusBadge.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm border-border/50">
              {schedulerStatusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusChange(driver.id, option.value)}
                  className={cn(
                    "cursor-pointer gap-2",
                    driver.status === option.value && "bg-primary/10"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", option.bgColor)} />
                  <span className={option.color}>{option.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openMarkOffDialog(driver.id, driver.name)}
                className="cursor-pointer gap-2 text-amber-400"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Mark Off
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderAmtrakShifts = () => {
    const amtrakEligibleDrivers = drivers.filter(d => 
      (d as any).amtrak_primary || (d as any).amtrak_trained
    );
    
    return (
      <div className="grid gap-3 sm:grid-cols-3">
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
            <div 
              key={shift.number} 
              className={cn(
                "rounded-xl border-2 transition-all duration-200",
                assignedDriver 
                  ? "border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5" 
                  : "border-dashed border-border bg-card/50"
              )}
            >
              <div className="px-4 py-3 border-b border-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Train className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{shift.label}</span>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {shift.start}–{shift.end}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-3">
                <Select
                  value={assignedDriver?.id || "__none__"}
                  onValueChange={(value) => assignAmtrakShift(value === "__none__" ? null : value, shift.number)}
                >
                  <SelectTrigger className={cn(
                    "h-10 rounded-lg",
                    assignedDriver ? "border-blue-500/30 bg-blue-500/5" : "border-dashed"
                  )}>
                    <SelectValue placeholder="Assign driver..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-sm">
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
                              <Badge className="h-4 px-1.5 text-[9px] bg-blue-500/20 text-blue-400 border-0">
                                Primary
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
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
                        "w-full px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        getStatusBadge(assignedDriver.status).color,
                        getStatusBadge(assignedDriver.status).bgColor,
                        "border border-transparent hover:border-blue-500/20"
                      )}>
                        {getStatusBadge(assignedDriver.status).label}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm">
                      {((assignedDriver as any).amtrak_primary ? shuttleStatusOptions : schedulerStatusOptions).map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleStatusChange(assignedDriver.id, option.value)}
                          className="gap-2"
                        >
                          <span className={cn("h-2 w-2 rounded-full", option.bgColor)} />
                          <span className={option.color}>{option.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
      <div className={cn(
        "rounded-xl border-2 transition-all duration-200",
        assignedDriver 
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" 
          : "border-dashed border-border bg-card/50"
      )}>
        <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-semibold">BPH Shuttle</span>
              <div className="text-xs text-muted-foreground">Mon–Fri</div>
            </div>
          </div>
          {bphSchedule && !editingBphTimes && (
            <button 
              onClick={() => {
                setBphTempStartTime(bphSchedule.start_time || "08:00");
                setBphTempEndTime(bphSchedule.end_time || "16:00");
                setEditingBphTimes(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-xs font-mono text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              {formatTime(bphSchedule.start_time)}–{formatTime(bphSchedule.end_time)}
            </button>
          )}
          {!bphSchedule && (
            <span className="text-xs text-muted-foreground italic">Assign to set times</span>
          )}
        </div>
        <div className="p-4 space-y-3">
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
                "flex-1 h-10 rounded-lg",
                assignedDriver ? "border-emerald-500/30 bg-emerald-500/5" : "border-dashed"
              )}>
                <SelectValue placeholder="Assign driver..." />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-sm">
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
                          <Badge className="h-4 px-1.5 text-[9px] bg-emerald-500/20 text-emerald-400 border-0">
                            Primary
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
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
                    "px-4 py-2 rounded-lg text-xs font-medium transition-all",
                    getStatusBadge(assignedDriver.status).color,
                    getStatusBadge(assignedDriver.status).bgColor,
                    "border border-transparent hover:border-emerald-500/20"
                  )}>
                    {getStatusBadge(assignedDriver.status).label}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm">
                  {((assignedDriver as any).bph_primary ? shuttleStatusOptions : schedulerStatusOptions).map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusChange(assignedDriver.id, option.value)}
                      className="gap-2"
                    >
                      <span className={cn("h-2 w-2 rounded-full", option.bgColor)} />
                      <span className={option.color}>{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {bphSchedule && editingBphTimes && (
            <div className="flex items-end gap-3 p-4 rounded-xl bg-card border border-emerald-500/20">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Start</Label>
                <Input
                  type="time"
                  value={bphTempStartTime}
                  onChange={(e) => setBphTempStartTime(e.target.value)}
                  className="h-9 w-28 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">End</Label>
                <Input
                  type="time"
                  value={bphTempEndTime}
                  onChange={(e) => setBphTempEndTime(e.target.value)}
                  className="h-9 w-28 text-sm rounded-lg"
                />
              </div>
              <Button
                size="sm"
                className="h-9 px-3 rounded-lg"
                onClick={() => {
                  updateBphShiftTimes(bphTempStartTime, bphTempEndTime);
                  setEditingBphTimes(false);
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-3 rounded-lg"
                onClick={() => setEditingBphTimes(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Enhanced Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">Dispatch</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Schedule</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Weekly Planner</p>
              </div>
            </div>
          </div>
          <Link to="/shuttle-schedules">
            <Button variant="outline" size="sm" className="gap-2 rounded-lg border-border/50 hover:bg-muted/50">
              <Train className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">Manage Shuttles</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Date Navigation Card */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 space-y-4">
          {/* Date Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-xl hover:bg-muted" 
                onClick={goToPreviousDay} 
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-xl hover:bg-muted" 
                onClick={goToNextDay} 
                disabled={!canGoForward}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              {!isToday && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/10" 
                  onClick={goToToday}
                >
                  Today
                </Button>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold tracking-tight">
                {format(selectedDate, "EEEE")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "MMMM d, yyyy")}
                {isToday && (
                  <span className="ml-2 text-primary font-medium">• Today</span>
                )}
              </p>
            </div>
          </div>

          {/* Week Calendar Pills */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const dayIsToday = isSameDay(day, new Date());
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative py-3 rounded-xl text-center transition-all duration-200",
                    isSelected 
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50"
                  )}
                >
                  <div className={cn(
                    "text-[10px] uppercase tracking-wider mb-0.5",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE")}
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-primary-foreground" : ""
                  )}>
                    {format(day, "d")}
                  </div>
                  {dayIsToday && !isSelected && (
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as typeof scheduleTab)}>
            <TabsList className="h-11 p-1.5 bg-muted/50 rounded-xl w-full grid grid-cols-3">
              <TabsTrigger 
                value="all" 
                className="rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                All Drivers
              </TabsTrigger>
              <TabsTrigger 
                value="black-car" 
                className="rounded-lg text-sm font-medium gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Car className="h-4 w-4" />
                Above All
              </TabsTrigger>
              <TabsTrigger 
                value="shuttles" 
                className="rounded-lg text-sm font-medium gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Train className="h-4 w-4" />
                Shuttles
                {shuttlePrimaryCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-semibold">
                    {shuttlePrimaryCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                statusFilter === "all"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
            >
              All
            </button>
            {schedulerStatusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  statusFilter === option.value
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                )}
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  option.value === "unconfirmed" && "bg-muted-foreground",
                  option.value === "confirmed" && "bg-emerald-400",
                  option.value === "on_the_clock" && "bg-blue-400",
                  option.value === "done" && "bg-violet-400"
                )} />
                {option.label}
              </button>
            ))}
          </div>

          {/* Trained Coverage Toggle */}
          {scheduleTab === "shuttles" && trainedCoverageDrivers.length > 0 && (
            <Button
              variant={showTrainedCoverage ? "secondary" : "outline"}
              size="sm"
              className="h-8 rounded-full text-xs gap-2 flex-shrink-0 border-border/50"
              onClick={() => setShowTrainedCoverage(!showTrainedCoverage)}
            >
              {showTrainedCoverage ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Backup ({trainedCoverageDrivers.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Loading schedule...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Shuttles tab */}
            {scheduleTab === "shuttles" && (
              <>
                {/* Amtrak section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Train className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-400">Amtrak Shuttle</h3>
                      <p className="text-xs text-muted-foreground">3 shifts daily</p>
                    </div>
                  </div>
                  {renderAmtrakShifts()}
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                </div>

                {/* BPH section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-400">BPH Shuttle</h3>
                      <p className="text-xs text-muted-foreground">Mon–Fri, 12-hour shifts</p>
                    </div>
                  </div>
                  {renderBphShift()}
                </div>

                {/* Backup drivers */}
                {showTrainedCoverage && trainedCoverageDrivers.length > 0 && (
                  <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                    <div className="border-b border-border/50 px-4 py-3 bg-muted/30">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Backup Drivers
                        <span className="text-xs text-muted-foreground font-normal">(Trained)</span>
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {trainedCoverageDrivers.map(driver => renderDriverRow(driver, false))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regular schedule views */}
            {(scheduleTab === "all" || scheduleTab === "black-car") && (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-emerald-400">{availableDrivers.length}</span>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <UserX className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold">{offDrivers.length}</span>
                      <p className="text-xs text-muted-foreground">Day Off</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold">{unscheduledDrivers.length}</span>
                      <p className="text-xs text-muted-foreground">Unset</p>
                    </div>
                  </div>
                </div>

                {/* Available Drivers */}
                {availableDrivers.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent overflow-hidden">
                    <div className="border-b border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                        <UserCheck className="h-4 w-4" />
                        Scheduled
                        <span className="ml-auto text-sm font-normal text-muted-foreground">
                          {availableDrivers.length} drivers
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {availableDrivers.map(driver => renderDriverRow(driver))}
                    </div>
                  </div>
                )}

                {/* Off Drivers */}
                {offDrivers.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden">
                    <div className="border-b border-amber-500/10 bg-amber-500/5 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-amber-400">
                        <UserX className="h-4 w-4" />
                        Day Off
                        <span className="ml-auto text-sm font-normal text-muted-foreground">
                          {offDrivers.length} drivers
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {offDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-amber-400">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-sm text-muted-foreground">{driver.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleRestoreFromOff(driver.id, driver.name)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unscheduled Drivers */}
                {unscheduledDrivers.length > 0 && (
                  <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
                    <div className="border-b border-border/50 bg-muted/20 px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        No Schedule
                        <span className="ml-auto text-sm font-normal">
                          {unscheduledDrivers.length} drivers
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {unscheduledDrivers.map(driver => (
                        <div key={driver.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center">
                              <span className="text-sm font-medium text-muted-foreground">
                                {driver.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-sm text-muted-foreground">{driver.name}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                getStatusBadge(driver.status).color,
                                getStatusBadge(driver.status).bgColor
                              )}>
                                {getStatusBadge(driver.status).label}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm">
                              {schedulerStatusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handleStatusChange(driver.id, option.value)}
                                  className={cn("cursor-pointer gap-2", driver.status === option.value && "bg-primary/10")}
                                >
                                  <span className={cn("h-2 w-2 rounded-full", option.bgColor)} />
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

            {filteredDrivers.length === 0 && scheduleTab !== "shuttles" && (
              <div className="text-center py-16">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No drivers found for this view.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mark Off Dialog */}
      <Dialog open={showMarkOffDialog} onOpenChange={setShowMarkOffDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-amber-400" />
              Mark Driver Off
            </DialogTitle>
            <DialogDescription>
              Mark {markOffDriver?.name} as off for {format(selectedDate, "EEEE, MMM d")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {markOffDriver?.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium">{markOffDriver?.name}</p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <Checkbox
                id="callout"
                checked={isCallOut}
                onCheckedChange={(checked) => setIsCallOut(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="callout" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <PhoneOff className="h-4 w-4 text-amber-400" />
                  Driver called out
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check if the driver notified of their absence
                </p>
              </div>
            </div>

            {isCallOut && (
              <div className="space-y-2">
                <Label htmlFor="note" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Note (optional)
                </Label>
                <Textarea
                  id="note"
                  placeholder="Reason for call out..."
                  value={callOutNote}
                  onChange={(e) => setCallOutNote(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowMarkOffDialog(false)}
              disabled={markingOff}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkOff}
              disabled={markingOff}
              className="gap-2"
            >
              {markingOff ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4" />
                  Mark Off
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scheduler;
