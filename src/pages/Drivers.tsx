import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Users, BarChart3, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, Clock, PhoneOff, Truck, X, Undo2, Search, UserPlus } from "lucide-react";
import { format, addDays, isSameDay, startOfDay, getDay } from "date-fns";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { DriverDetailsPanel } from "@/components/DriverDetailsPanel";
import { DriverPicker } from "@/components/DriverPicker";
import { DriverActionToolbar } from "@/components/DriverActionToolbar";
import { DriverWorkbookPanel } from "@/components/drivers";
import { QuickVehiclePickerDialog } from "@/components/QuickVehiclePickerDialog";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { useShifts } from "@/hooks/useShifts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type DriverSchedule = Database["public"]["Tables"]["driver_schedules"]["Row"];

interface CallOut {
  id: string;
  driver_id: string;
  driver_name: string;
  call_out_date: string;
  note: string | null;
}

interface FutureAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  assignment_date: string;
  report_time: string | null;
  vehicle: string | null;
}

const Drivers = () => {
  const { toast } = useToast();
  const {
    drivers,
    vehicles,
    loading,
    recentlyUpdatedDrivers,
    updateDriverStatus,
  } = useDispatchData();
  const { isAdmin } = useUserRole();
  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  
  // Use shifts hook for selected workday
  const { shifts, getDriverStatusForWorkday, punchIn, punchOut, getOpenShiftForDriver } = useShifts(selectedDate);
  const [schedules, setSchedules] = useState<DriverSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  
  const [todayCallOuts, setTodayCallOuts] = useState<CallOut[]>([]);
  const [selectedDateCallOuts, setSelectedDateCallOuts] = useState<CallOut[]>([]);
  const [offDriversOpen, setOffDriversOpen] = useState(false);
  const [offDriverSearch, setOffDriverSearch] = useState("");
  const [futureAssignments, setFutureAssignments] = useState<FutureAssignment[]>();
  const [globalCdlFilter, setGlobalCdlFilter] = useState<"all" | "cdl" | "non-cdl">("all");
  
  // Selected driver state
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  
  // Assign dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState<{ id: string; name: string } | null>(null);
  const [assignReportTime, setAssignReportTime] = useState("");
  const [assignVehicle, setAssignVehicle] = useState("__none__");
  const assignButtonRef = useRef<HTMLButtonElement>(null);
  const assignReportTimeRef = useRef<HTMLInputElement>(null);
  const assignDriverSelectRef = useRef<HTMLButtonElement>(null);
  const driverListRef = useRef<HTMLDivElement>(null);
  
  // OFF dialog state
  const [showOffDialog, setShowOffDialog] = useState(false);
  const [offDriver, setOffDriver] = useState<{ id: string; name: string } | null>(null);
  const [isCallOutChecked, setIsCallOutChecked] = useState(false);
  const [callOutNote, setCallOutNote] = useState("");
  const [offDates, setOffDates] = useState<Date[]>([]);
  
  // Punch In dialog state
  const [showPunchInDialog, setShowPunchInDialog] = useState(false);
  const [punchInDriver, setPunchInDriver] = useState<{ id: string; name: string } | null>(null);
  const [punchInTime, setPunchInTime] = useState("");
  const [punchInVehicle, setPunchInVehicle] = useState<string>("__none__");
  const [punchInTabStage, setPunchInTabStage] = useState<1 | 2>(1);
  const punchInDriverRef = useRef<HTMLButtonElement>(null);
  const punchInVehicleRef = useRef<HTMLButtonElement>(null);
  const punchInTimeRef = useRef<HTMLInputElement>(null);
  const punchInButtonRef = useRef<HTMLButtonElement>(null);
  
  // Punch Out dialog state
  const [showPunchOutDialog, setShowPunchOutDialog] = useState(false);
  const [punchOutDriver, setPunchOutDriver] = useState<{ id: string; name: string } | null>(null);
  const [punchOutTime, setPunchOutTime] = useState("");
  const [punchOutTabStage, setPunchOutTabStage] = useState<1 | 2>(1);
  const punchOutDriverRef = useRef<HTMLButtonElement>(null);
  const punchOutTimeRef = useRef<HTMLInputElement>(null);
  const punchOutButtonRef = useRef<HTMLButtonElement>(null);
  
  // Driver picker state (for keyboard shortcuts when no driver selected)
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<"confirm" | "off" | null>(null);
  
  // Quick vehicle picker for Shift+P when no vehicle assigned
  const [showQuickVehiclePicker, setShowQuickVehiclePicker] = useState(false);
  const [quickPunchInDriver, setQuickPunchInDriver] = useState<{ id: string; name: string } | null>(null);
  
  // Off driver assignment confirmation state
  const [showOffDriverConfirm, setShowOffDriverConfirm] = useState(false);
  const [pendingOffDriver, setPendingOffDriver] = useState<{ id: string; name: string } | null>(null);
  
  // Undo last action state
  const [lastAction, setLastAction] = useState<{
    driverId: string;
    driverName: string;
    previousStatus: string;
    previousVehicle: string | null;
    previousReportTime: string | null;
    actionType: string;
  } | null>(null);

  const today = startOfDay(new Date());
  const isToday = isSameDay(selectedDate, today);
  const isFutureDate = selectedDate > today;


  // Fetch driver schedules and today's call outs
  useEffect(() => {
    const fetchData = async () => {
      setSchedulesLoading(true);
      
      const [schedulesRes, callOutsRes] = await Promise.all([
        supabase.from("driver_schedules").select("*"),
        supabase
          .from("call_outs")
          .select("*")
          .eq("call_out_date", format(today, "yyyy-MM-dd")),
      ]);
      
      if (!schedulesRes.error && schedulesRes.data) {
        setSchedules(schedulesRes.data);
      }
      
      if (!callOutsRes.error && callOutsRes.data) {
        setTodayCallOuts(callOutsRes.data as CallOut[]);
      }
      
      setSchedulesLoading(false);
    };
    fetchData();
  }, []);

  // Fetch future assignments and call-outs when selected date changes
  useEffect(() => {
    if (!isFutureDate) {
      setFutureAssignments([]);
      setSelectedDateCallOuts([]);
      return;
    }
    
    const fetchFutureData = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const [assignmentsRes, callOutsRes] = await Promise.all([
        supabase
          .from("future_assignments")
          .select("*")
          .eq("assignment_date", dateStr),
        supabase
          .from("call_outs")
          .select("*")
          .eq("call_out_date", dateStr),
      ]);
      
      if (!assignmentsRes.error && assignmentsRes.data) {
        setFutureAssignments(assignmentsRes.data as FutureAssignment[]);
      }
      
      if (!callOutsRes.error && callOutsRes.data) {
        setSelectedDateCallOuts(callOutsRes.data as CallOut[]);
      }
    };
    
    fetchFutureData();
  }, [selectedDate, isFutureDate]);

  // Get drivers available on selected date based on their schedule
  const getAvailableDriversWithSchedule = useMemo(() => {
    if (isToday) {
      return null; // Use actual driver statuses for today
    }

    // day_of_week: 0 = Sunday, 1 = Monday, etc.
    const dayOfWeek = getDay(selectedDate);
    
    // Find schedules for this day that are NOT marked as off
    const scheduleMap = new Map<string, { start_time: string | null; end_time: string | null; is_any_hours: boolean }>();
    
    schedules.forEach((schedule) => {
      if (schedule.day_of_week === dayOfWeek && !schedule.is_off) {
        scheduleMap.set(schedule.driver_id, {
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_any_hours: (schedule as any).is_any_hours || false,
        });
      }
    });

    return drivers
      .filter((driver) => scheduleMap.has(driver.id))
      .map((driver) => ({
        ...driver,
        schedule: scheduleMap.get(driver.id)!,
      }));
  }, [selectedDate, schedules, drivers, isToday]);

  // For future dates, incorporate future assignments
  // For today, derive working/punched-out status from shifts table
  const displayDrivers = useMemo(() => {
    if (isToday) {
      // Get the day of week for today to filter by schedule
      const dayOfWeek = getDay(today);
      
      // Get driver IDs that ARE scheduled for today (not marked as off) with their start times and is_any_hours
      const scheduledDriverMap = new Map<string, { is_any_hours: boolean; start_time: string | null }>();
      schedules
        .filter((s) => s.day_of_week === dayOfWeek && !s.is_off)
        .forEach((s) => scheduledDriverMap.set(s.driver_id, {
          is_any_hours: (s as any).is_any_hours || false,
          start_time: s.start_time,
        }));
      
      // Build a map of driver shift status from shifts table
      const driverShiftStatusMap = new Map<string, { status: "on_the_clock" | "done"; shift: typeof shifts[0] }>();
      shifts.forEach((shift) => {
        // Prioritize open shifts (on_the_clock) over closed shifts
        const existing = driverShiftStatusMap.get(shift.driver_id);
        if (!shift.punch_out_at) {
          // Open shift = on_the_clock
          driverShiftStatusMap.set(shift.driver_id, { status: "on_the_clock", shift });
        } else if (!existing || existing.status !== "on_the_clock") {
          // Closed shift = done (only if no open shift)
          driverShiftStatusMap.set(shift.driver_id, { status: "done", shift });
        }
      });
      
      // Include drivers who are scheduled for today OR who have shift activity for today
      // Also include drivers with base status of confirmed
      const todayDrivers = drivers
        .filter((d) => {
          const hasSchedule = scheduledDriverMap.has(d.id);
          const hasShiftActivity = driverShiftStatusMap.has(d.id);
          const isConfirmed = d.status === "confirmed";
          return (hasSchedule || hasShiftActivity || isConfirmed);
        })
        .map((d) => {
          // Derive status from shifts table if available
          const shiftData = driverShiftStatusMap.get(d.id);
          let derivedStatus: "unconfirmed" | "confirmed" | "on_the_clock" | "done" = d.status;
          let vehicleFromShift = d.vehicle;
          
          if (shiftData) {
            derivedStatus = shiftData.status;
            // Use vehicle from shift if available
            if (shiftData.shift.vehicle_unit) {
              vehicleFromShift = shiftData.shift.vehicle_unit;
            }
          }
          
          return { 
            ...d, 
            status: derivedStatus,
            vehicle: vehicleFromShift,
            schedule: null as { start_time: string | null; end_time: string | null; is_any_hours: boolean } | null,
            isAnyHours: scheduledDriverMap.get(d.id)?.is_any_hours || false,
            scheduledStartTime: scheduledDriverMap.get(d.id)?.start_time || null,
            shiftData: shiftData?.shift || null,
          };
        });
      
      // Define status priority order
      const statusOrder: Record<string, number> = {
        "confirmed": 1,
        "on_the_clock": 2,
        "done": 3,
        "unconfirmed": 4,
      };
      
      // Sort by status first, then by start time within each status group
      return todayDrivers.sort((a, b) => {
        const aStatusOrder = statusOrder[a.status] ?? 99;
        const bStatusOrder = statusOrder[b.status] ?? 99;
        if (aStatusOrder !== bStatusOrder) {
          return aStatusOrder - bStatusOrder;
        }
        const aTime = a.scheduledStartTime || "99:99";
        const bTime = b.scheduledStartTime || "99:99";
        return aTime.localeCompare(bTime);
      });
    }
    
    // Create a map of assigned driver IDs
    const assignedMap = new Map(futureAssignments.map(a => [a.driver_id, a]));
    
    // Create a set of driver IDs who are marked OFF for this date
    const offDriverIds = new Set(selectedDateCallOuts.map(c => c.driver_id));
    
    // For future dates, return available drivers with their assignment status
    // Exclude drivers who are marked OFF
    const futureDrivers = (getAvailableDriversWithSchedule || [])
      .filter((driver) => !offDriverIds.has(driver.id))
      .map((driver) => {
        const assignment = assignedMap.get(driver.id);
        if (assignment) {
          return {
            ...driver,
            status: "confirmed" as const,
            vehicle: assignment.vehicle,
            report_time: assignment.report_time,
            isAnyHours: driver.schedule?.is_any_hours || false,
          };
        }
        return {
          ...driver,
          status: "unconfirmed" as const,
          vehicle: null,
          report_time: null,
          isAnyHours: driver.schedule?.is_any_hours || false,
        };
      });

    // Define status priority order for future dates
    const statusOrder: Record<string, number> = {
      "confirmed": 1,
      "unconfirmed": 2,
    };

    // Sort by status first, then by start time within each status group
    return futureDrivers.sort((a, b) => {
      const aStatusOrder = statusOrder[a.status] ?? 99;
      const bStatusOrder = statusOrder[b.status] ?? 99;
      if (aStatusOrder !== bStatusOrder) {
        return aStatusOrder - bStatusOrder;
      }
      const aTime = a.schedule?.start_time || "99:99";
      const bTime = b.schedule?.start_time || "99:99";
      return aTime.localeCompare(bTime);
    });
  }, [isToday, getAvailableDriversWithSchedule, drivers, futureAssignments, schedules, selectedDateCallOuts, shifts]);

  // Handler for assigning a driver
  const handleAssignDriver = async () => {
    if (!assigningDriver) return;
    
    // Store previous state for undo
    const driver = drivers.find(d => d.id === assigningDriver.id);
    if (driver) {
      setLastAction({
        driverId: driver.id,
        driverName: driver.name,
        previousStatus: driver.status,
        previousVehicle: driver.vehicle,
        previousReportTime: driver.report_time,
        actionType: "assign",
      });
    }
    
    if (isFutureDate) {
      // Future date: insert into future_assignments table
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("future_assignments")
        .insert({
          driver_id: assigningDriver.id,
          driver_name: assigningDriver.name,
          assignment_date: dateStr,
          report_time: assignReportTime || null,
          vehicle: assignVehicle === "__none__" ? null : assignVehicle,
          created_by: user?.id || null,
        })
        .select()
        .single();
      
      if (error) {
        toast({
          title: "Error assigning driver",
          description: error.message,
          variant: "destructive",
        });
        setLastAction(null); // Clear on error
      } else if (data) {
        toast({
          title: "Driver assigned",
          description: `${assigningDriver.name} assigned for ${format(selectedDate, "EEEE, MMM d")}`,
        });
        setFutureAssignments([...futureAssignments, data as FutureAssignment]);
      }
    } else {
      // Today: update driver
      // If report time is set, driver becomes "confirmed" (they've confirmed they're coming in)
      // If only vehicle is assigned without report time, status stays the same
      const driver = drivers.find(d => d.id === assigningDriver.id);
      const vehicleValue = assignVehicle === "__none__" ? null : assignVehicle;
      const reportTimeValue = assignReportTime || null;
      
      // Setting a report time = confirming the driver
      const shouldConfirm = !!reportTimeValue && driver?.status === "unconfirmed";
      
      const updateData: Record<string, unknown> = {
        vehicle: vehicleValue,
        report_time: reportTimeValue,
      };
      
      if (shouldConfirm) {
        updateData.status = "confirmed";
      }
      
      const { error } = await supabase
        .from("drivers")
        .update(updateData)
        .eq("id", assigningDriver.id);
      
      if (error) {
        toast({
          title: "Error assigning driver",
          description: error.message,
          variant: "destructive",
        });
        setLastAction(null);
      } else {
        const action = shouldConfirm ? "confirmed" : "assigned";
        toast({
          title: `Driver ${action}`,
          description: `${assigningDriver.name} ${shouldConfirm ? "confirmed with report time" : `assigned to ${vehicleValue || "no vehicle"}`}`,
        });
      }
    }
    
    setShowAssignDialog(false);
    setAssigningDriver(null);
    setAssignReportTime("");
    setAssignVehicle("__none__");
  };

  // Handler for unassigning a driver for future date
  const handleUnassignFutureDriver = async (driverId: string, driverName: string) => {
    if (!isFutureDate) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const { error } = await supabase
      .from("future_assignments")
      .delete()
      .eq("driver_id", driverId)
      .eq("assignment_date", dateStr);
    
    if (error) {
      toast({
        title: "Error unassigning driver",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Driver unassigned",
        description: `${driverName} unassigned from ${format(selectedDate, "EEEE, MMM d")}`,
      });
      setFutureAssignments(futureAssignments.filter(a => a.driver_id !== driverId));
    }
  };

  // Handler for marking a driver OFF for a future date
  const handleMarkOffFutureDriver = async (driverId: string, driverName: string) => {
    if (!isFutureDate) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    
    // First, remove any future assignment for this driver on this date
    await supabase
      .from("future_assignments")
      .delete()
      .eq("driver_id", driverId)
      .eq("assignment_date", dateStr);
    
    // Then, create a call_out record
    const { error } = await supabase.from("call_outs").insert({
      driver_id: driverId,
      driver_name: driverName,
      call_out_date: dateStr,
      created_by: user?.id || null,
      note: null,
    });
    
    if (error) {
      toast({
        title: "Error marking driver OFF",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Driver marked OFF",
        description: `${driverName} marked OFF for ${format(selectedDate, "EEEE, MMM d")}`,
      });
      // Update local state
      setFutureAssignments(futureAssignments.filter(a => a.driver_id !== driverId));
      setSelectedDateCallOuts([...selectedDateCallOuts, {
        id: crypto.randomUUID(),
        driver_id: driverId,
        driver_name: driverName,
        call_out_date: dateStr,
        note: null,
      }]);
    }
  };

  // Handler for removing OFF status from a driver for a future date
  const handleRemoveOffFutureDriver = async (driverId: string, driverName: string) => {
    if (!isFutureDate) return;
    
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const { error } = await supabase
      .from("call_outs")
      .delete()
      .eq("driver_id", driverId)
      .eq("call_out_date", dateStr);
    
    if (error) {
      toast({
        title: "Error removing OFF status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "OFF status removed",
        description: `${driverName} is now scheduled for ${format(selectedDate, "EEEE, MMM d")}`,
      });
      setSelectedDateCallOuts(selectedDateCallOuts.filter(c => c.driver_id !== driverId));
    }
  };

  const openAssignDialog = (driverId: string, driverName: string) => {
    const driver = drivers.find(d => d.id === driverId);
    const defaultVehicle = (driver as any)?.default_vehicle;
    
    // Check if driver is done (punched out) - might need confirmation
    // Note: "off" status no longer exists, drivers are either unconfirmed, confirmed, on_the_clock, or done
    
    setAssigningDriver({ id: driverId, name: driverName });
    setAssignReportTime("");
    // Pre-fill with driver's default/take-home vehicle if set
    setAssignVehicle(defaultVehicle || "__none__");
    setShowAssignDialog(true);
    // Focus report time after dialog opens
    setTimeout(() => {
      assignReportTimeRef.current?.focus();
    }, 50);
  };
  
  const confirmOffDriverAssign = () => {
    if (!pendingOffDriver) return;
    const driver = drivers.find(d => d.id === pendingOffDriver.id);
    const defaultVehicle = (driver as any)?.default_vehicle;
    
    setAssigningDriver({ id: pendingOffDriver.id, name: pendingOffDriver.name });
    setAssignReportTime("");
    setAssignVehicle(defaultVehicle || "__none__");
    setShowOffDriverConfirm(false);
    setPendingOffDriver(null);
    setShowAssignDialog(true);
    // Focus report time after dialog opens
    setTimeout(() => {
      assignReportTimeRef.current?.focus();
    }, 50);
  };

  const openOffDialog = (driverId: string, driverName: string) => {
    setOffDriver({ id: driverId, name: driverName });
    setIsCallOutChecked(false);
    setCallOutNote("");
    setShowOffDialog(true);
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const openPunchInDialog = (driverId: string, driverName: string) => {
    setPunchInDriver({ id: driverId, name: driverName });
    setPunchInVehicle(getDriverDefaultVehicle(driverId));
    setPunchInTime(getCurrentTimeString());
    setShowPunchInDialog(true);
  };

  const openPunchOutDialog = (driverId: string, driverName: string) => {
    setPunchOutDriver({ id: driverId, name: driverName });
    setPunchOutTime(getCurrentTimeString());
    setShowPunchOutDialog(true);
  };

  const handleConfirmOff = async () => {
    if (!offDriver) return;
    
    const hasFutureDates = offDates.length > 0;
    const includestoday = offDates.some(d => isSameDay(d, today));
    
    // Store previous state for undo (only if marking off for today)
    if (!hasFutureDates || includestoday) {
      const driver = drivers.find(d => d.id === offDriver.id);
      if (driver) {
        setLastAction({
          driverId: driver.id,
          driverName: driver.name,
          previousStatus: driver.status,
          previousVehicle: driver.vehicle,
          previousReportTime: driver.report_time,
          actionType: "off",
        });
      }
    }
    
    // Determine which dates to mark off
    const datesToMarkOff = hasFutureDates ? offDates : [today];
    
    // If it's a call out, record it for all selected dates
    if (isCallOutChecked) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = datesToMarkOff.map(date => ({
        driver_id: offDriver.id,
        driver_name: offDriver.name,
        note: callOutNote.trim() || null,
        created_by: user?.id || null,
        call_out_date: format(date, "yyyy-MM-dd"),
      }));
      
      const { error } = await supabase.from("call_outs").insert(insertData);

      if (error) {
        toast({
          title: "Error recording call out",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const dateCount = datesToMarkOff.length;
        toast({
          title: "Call out recorded",
          description: `${offDriver.name} marked as called out for ${dateCount} day${dateCount > 1 ? "s" : ""}`,
        });
        // Refresh call outs for today if today is included
        if (!hasFutureDates || includestoday) {
          const { data: callOutsRes } = await supabase
            .from("call_outs")
            .select("*")
            .eq("call_out_date", format(today, "yyyy-MM-dd"));
          if (callOutsRes) {
            setTodayCallOuts(callOutsRes as CallOut[]);
          }
        }
      }
    }

    // Only update driver status if marking off for today
    // Note: We create a call_out record but keep driver status as-is (done or unconfirmed)
    if (!hasFutureDates || includestoday) {
      // Driver remains in their current status, call_out record tracks the absence
    } else {
      const futureDatesStr = offDates.map(d => format(d, "EEE, MMM d")).join(", ");
      toast({
        title: "Scheduled OFF",
        description: `${offDriver.name} will be marked OFF on: ${futureDatesStr}`,
      });
    }
    
    setShowOffDialog(false);
    setOffDriver(null);
    setIsCallOutChecked(false);
    setCallOutNote("");
    setOffDates([]);
  };

  // Shortcut action handlers with guardrails
  const executeAssign = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Allow from unconfirmed or confirmed
    if (["unconfirmed", "confirmed"].includes(driver.status)) {
      openAssignDialog(driver.id, driver.name);
    } else if (driver.status === "on_the_clock") {
      toast({
        title: "Driver is working",
        description: "Punch out first before reassigning",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cannot assign",
        description: `Driver is currently ${driver.status}`,
        variant: "destructive",
      });
    }
  }, [drivers, toast]);

  // Helper to get auto-populated vehicle for a driver
  const getDriverDefaultVehicle = useCallback((driverId: string): string => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return "__none__";
    
    // First check if driver has an assigned vehicle already
    if (driver.vehicle) {
      return driver.vehicle;
    }
    
    // Check if driver is a take-home driver (has a vehicle assigned to them)
    const takeHomeVehicle = vehicles.find(
      v => v.assigned_driver_id === driverId && v.classification === "take_home"
    );
    if (takeHomeVehicle) {
      return takeHomeVehicle.unit;
    }
    
    // Check default_vehicle field
    if (driver.default_vehicle) {
      return driver.default_vehicle;
    }
    
    return "__none__";
  }, [drivers, vehicles]);

  // Always open the modal - validation happens on submit
  const executePunchIn = useCallback((driverId?: string) => {
    const currentTime = (() => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    })();
    
    if (driverId) {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        setPunchInDriver({ id: driver.id, name: driver.name });
        setPunchInVehicle(getDriverDefaultVehicle(driver.id));
      }
    } else {
      setPunchInVehicle("__none__");
    }
    setPunchInTime(currentTime);
    setShowPunchInDialog(true);
  }, [drivers, getDriverDefaultVehicle]);

  // Always open the modal - validation happens on submit
  const executePunchOut = useCallback((driverId?: string) => {
    const currentTime = (() => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    })();
    
    if (driverId) {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        setPunchOutDriver({ id: driver.id, name: driver.name });
      }
    }
    setPunchOutTime(currentTime);
    setShowPunchOutDialog(true);
  }, [drivers]);

  // Quick punch-in without dialog (Shift+P)
  const executeQuickPunchIn = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    // Only allow for confirmed drivers (not unconfirmed - they need vehicle selection)
    if (driver.status !== "confirmed") {
      toast({
        title: "Cannot quick punch-in",
        description: driver.status === "unconfirmed" 
          ? "Unconfirmed drivers must be punched in via dialog to select a vehicle"
          : driver.status === "on_the_clock"
          ? `${driver.name} is already on the clock`
          : `${driver.name} has already completed their shift`,
        variant: "destructive",
      });
      return;
    }

    // Check if driver already has an open shift for today
    const existingShift = await getOpenShiftForDriver(driverId);
    if (existingShift) {
      toast({
        title: "Already punched in",
        description: `${driver.name} is already on the clock`,
      });
      return;
    }

    // Get the vehicle (current or default)
    const vehicleUnit = getDriverDefaultVehicle(driverId);
    
    // If no vehicle assigned, show vehicle picker dialog
    if (vehicleUnit === "__none__") {
      setQuickPunchInDriver({ id: driver.id, name: driver.name });
      setShowQuickVehiclePicker(true);
      return;
    }

    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "punch-in",
    });

    // Get current time
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const result = await punchIn(
      driverId,
      driver.name,
      currentTime,
      vehicleUnit
    );

    if (result.success) {
      toast({
        title: "Punched In",
        description: `${driver.name} is now working on ${vehicleUnit}`,
      });
    } else {
      toast({
        title: "Error punching in",
        description: result.error || "Failed to punch in",
        variant: "destructive",
      });
    }
  }, [drivers, getDriverDefaultVehicle, punchIn, toast, setLastAction, getOpenShiftForDriver]);

  // Handle quick vehicle picker selection for punch-in
  const handleQuickVehicleSelect = useCallback(async (vehicleUnit: string) => {
    if (!quickPunchInDriver) return;
    
    const driver = drivers.find(d => d.id === quickPunchInDriver.id);
    if (!driver) return;

    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "punch-in",
    });

    // Get current time
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const result = await punchIn(
      quickPunchInDriver.id,
      quickPunchInDriver.name,
      currentTime,
      vehicleUnit
    );

    if (result.success) {
      toast({
        title: "Punched In",
        description: `${quickPunchInDriver.name} is now working on ${vehicleUnit}`,
      });
    } else {
      toast({
        title: "Error punching in",
        description: result.error || "Failed to punch in",
        variant: "destructive",
      });
    }

    setQuickPunchInDriver(null);
  }, [quickPunchInDriver, drivers, punchIn, toast, setLastAction]);

  const handleConfirmPunchIn = async () => {
    if (!punchInDriver) return;
    
    const driver = drivers.find(d => d.id === punchInDriver.id);
    if (!driver) return;
    
    // Check if driver already has an open shift for today
    const existingShift = await getOpenShiftForDriver(punchInDriver.id);
    if (existingShift) {
      toast({
        title: "Already punched in",
        description: `${driver.name} is already on the clock`,
      });
      setShowPunchInDialog(false);
      setPunchInDriver(null);
      return;
    }
    
    // Require vehicle selection for unconfirmed drivers
    if (driver.status === "unconfirmed" && (punchInVehicle === "__none__" || !punchInVehicle)) {
      toast({
        title: "Vehicle required",
        description: "Please select a vehicle for this unconfirmed driver",
        variant: "destructive",
      });
      return;
    }
    
    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "punch-in",
    });
    
    const vehicleToAssign = punchInVehicle === "__none__" ? null : punchInVehicle;
    const result = await punchIn(
      punchInDriver.id,
      punchInDriver.name,
      punchInTime,
      vehicleToAssign
    );
    
    if (result.success) {
      toast({
        title: "Punched In",
        description: `${punchInDriver.name} is now working`,
      });
    } else {
      toast({
        title: "Error punching in",
        description: result.error || "Failed to punch in",
        variant: "destructive",
      });
    }
    
    setShowPunchInDialog(false);
    setPunchInDriver(null);
    setPunchInTime("");
    setPunchInVehicle("__none__");
  };

  const handleConfirmPunchOut = async () => {
    if (!punchOutDriver) return;
    
    // Find the open shift for this driver
    const openShift = await getOpenShiftForDriver(punchOutDriver.id);
    
    if (!openShift) {
      toast({
        title: "Cannot punch out",
        description: `${punchOutDriver.name} must be punched in first`,
        variant: "destructive",
      });
      return; // Keep dialog open so user can select a different driver
    }
    
    // Validate punch-out time is after punch-in time
    const punchInDate = new Date(openShift.punch_in_at);
    const punchInMinutes = punchInDate.getHours() * 60 + punchInDate.getMinutes();
    
    const [outHours, outMinutes] = punchOutTime.split(":").map(Number);
    const punchOutMinutes = outHours * 60 + outMinutes;
    
    if (punchOutMinutes <= punchInMinutes) {
      const punchInTimeStr = `${punchInDate.getHours().toString().padStart(2, "0")}:${punchInDate.getMinutes().toString().padStart(2, "0")}`;
      toast({
        title: "Invalid punch-out time",
        description: `Punch-out time (${punchOutTime}) must be after punch-in time (${punchInTimeStr})`,
        variant: "destructive",
      });
      return;
    }
    
    const driver = drivers.find(d => d.id === punchOutDriver.id);
    
    // Store previous state for undo
    if (driver) {
      setLastAction({
        driverId: driver.id,
        driverName: driver.name,
        previousStatus: driver.status,
        previousVehicle: driver.vehicle,
        previousReportTime: driver.report_time,
        actionType: "punch-out",
      });
    }
    
    const result = await punchOut(openShift.id, punchOutTime);
    
    if (result.success) {
      toast({
        title: "Punched Out",
        description: `${punchOutDriver.name} has punched out`,
      });
    } else {
      toast({
        title: "Error punching out",
        description: result.error || "Failed to punch out",
        variant: "destructive",
      });
    }
    
    setShowPunchOutDialog(false);
    setPunchOutDriver(null);
    setPunchOutTime("");
  };

  const executeOff = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Check if already has a call-out for today
    if (todayCallOuts.some(c => c.driver_id === driverId)) {
      toast({
        title: "Already OFF",
        description: `${driver.name} is already marked OFF`,
      });
      return;
    }
    
    if (driver.status === "on_the_clock") {
      toast({
        title: "Driver is working",
        description: "Punch out first before marking OFF",
        variant: "destructive",
      });
      return;
    }
    
    openOffDialog(driver.id, driver.name);
  }, [drivers, todayCallOuts, toast]);

  // Unassign - reset to unconfirmed
  const executeUnassign = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    if (driver.status !== "confirmed") {
      toast({
        title: "Cannot unassign",
        description: `Driver is not currently confirmed`,
        variant: "destructive",
      });
      return;
    }
    
    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "unassign",
    });
    
    updateDriverStatus(driverId, "unconfirmed");
    toast({
      title: "Driver unassigned",
      description: `${driver.name} has been unassigned`,
    });
  }, [drivers, updateDriverStatus, toast]);

  // Reset - set back to unconfirmed from done
  const executeReset = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "reset",
    });
    
    updateDriverStatus(driverId, "unconfirmed");
    toast({
      title: "Driver reset",
      description: `${driver.name} reset to unconfirmed`,
    });
  }, [drivers, updateDriverStatus, toast]);

  // Reset all drivers to unconfirmed (testing utility)
  const executeResetAll = useCallback(async () => {
    const activeDrivers = drivers.filter(d => d.is_active && d.status !== "unconfirmed");
    
    if (activeDrivers.length === 0) {
      toast({
        title: "Nothing to reset",
        description: "All drivers are already unconfirmed",
      });
      return;
    }
    
    // Reset all drivers to unconfirmed
    for (const driver of activeDrivers) {
      await supabase
        .from("drivers")
        .update({ 
          status: "unconfirmed", 
          vehicle: null, 
          report_time: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", driver.id);
    }
    
    toast({
      title: "All drivers reset",
      description: `Reset ${activeDrivers.length} drivers to unconfirmed`,
    });
  }, [drivers, toast]);

  // Simulate full workflow: unconfirmed → confirmed → on_the_clock → done (testing utility)
  const executeSimulateWorkflow = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    if (driver.status !== "unconfirmed") {
      toast({
        title: "Cannot simulate",
        description: "Driver must be unconfirmed to simulate workflow",
        variant: "destructive",
      });
      return;
    }
    
    // Find first available active vehicle
    const availableVehicle = vehicles.find(v => v.status === "active" && !v.driver);
    if (!availableVehicle) {
      toast({
        title: "Cannot simulate",
        description: "No available vehicles for simulation",
        variant: "destructive",
      });
      return;
    }
    
    // Set punch-in time to 6 hours ago to ensure punch-out works correctly
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const reportTime = `${sixHoursAgo.getHours().toString().padStart(2, '0')}:${sixHoursAgo.getMinutes().toString().padStart(2, '0')}`;
    const punchInTime = reportTime;
    const punchOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    toast({
      title: "Simulating workflow...",
      description: `${driver.name}: Starting simulation`,
    });
    
    // Step 1: Confirm driver with vehicle
    await new Promise(resolve => setTimeout(resolve, 400));
    await updateDriverStatus(driverId, "confirmed", availableVehicle.unit, reportTime);
    toast({
      title: "Step 1: Confirmed",
      description: `${driver.name} → ${availableVehicle.unit} at ${reportTime}`,
    });
    
    // Step 2: Punch in (creates shift record)
    await new Promise(resolve => setTimeout(resolve, 400));
    const punchInResult = await punchIn(driverId, driver.name, punchInTime, availableVehicle.unit);
    if (!punchInResult.success) {
      toast({
        title: "Simulation failed",
        description: `Punch in failed: ${punchInResult.error}`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Step 2: Punched In",
      description: `${driver.name} punched in at ${punchInTime}`,
    });
    
    // Step 3: Punch out (closes shift) - use the shiftId from punchIn result
    await new Promise(resolve => setTimeout(resolve, 400));
    const punchOutResult = await punchOut(punchInResult.shiftId!, punchOutTime);
    if (!punchOutResult.success) {
      toast({
        title: "Simulation failed", 
        description: `Punch out failed: ${punchOutResult.error}`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Step 3: Punched Out",
      description: `${driver.name} punched out at ${punchOutTime}`,
    });
    
    // Final success
    await new Promise(resolve => setTimeout(resolve, 300));
    toast({
      title: "✓ Simulation complete",
      description: `${driver.name} is now done. Reset button is available!`,
    });
  }, [drivers, vehicles, updateDriverStatus, punchIn, punchOut, toast]);

  // Undo last action
  const executeUndo = useCallback(() => {
    if (!lastAction) {
      toast({
        title: "Nothing to undo",
        description: "No recent action to revert",
      });
      return;
    }
    
    const { driverId, driverName, previousStatus, previousVehicle, previousReportTime, actionType } = lastAction;
    
    // Restore the previous state
    updateDriverStatus(
      driverId, 
      previousStatus as any, 
      previousReportTime || undefined, 
      previousVehicle || undefined
    );
    
    toast({
      title: "Action undone",
      description: `Reverted ${driverName} to ${previousStatus}`,
    });
    
    setLastAction(null);
  }, [lastAction, updateDriverStatus, toast]);

  // Handle driver picker selection (only used for assign and off actions now)
  const handleDriverPickerSelect = useCallback((driver: typeof drivers[0]) => {
    setSelectedDriverId(driver.id);
    setShowDriverPicker(false);
    
    // Execute the pending action
    if (pendingAction) {
      // Small delay to let selection settle
      setTimeout(() => {
        switch (pendingAction) {
          case "confirm":
            executeAssign(driver.id);
            break;
          case "off":
            executeOff(driver.id);
            break;
        }
        setPendingAction(null);
      }, 50);
    }
  }, [pendingAction, executeAssign, executeOff]);

  // Get drivers NOT scheduled for today (OFF drivers)
  const offDrivers = useMemo(() => {
    if (!isToday) return [];
    
    const dayOfWeek = getDay(today);
    
    // Get driver IDs that ARE scheduled for today (not marked as off)
    const scheduledDriverIds = new Set(
      schedules
        .filter((s) => s.day_of_week === dayOfWeek && !s.is_off)
        .map((s) => s.driver_id)
    );
    
    // Return drivers who are NOT scheduled for today OR have a call-out record
    return drivers.filter(
      (driver) => !scheduledDriverIds.has(driver.id) || todayCallOuts.some(c => c.driver_id === driver.id)
    );
  }, [drivers, schedules, isToday, todayCallOuts]);
  
  // Filtered off drivers based on search
  const filteredOffDrivers = useMemo(() => {
    if (!offDriverSearch.trim()) return offDrivers;
    const search = offDriverSearch.toLowerCase().trim();
    return offDrivers.filter(driver => 
      driver.name.toLowerCase().includes(search)
    );
  }, [offDrivers, offDriverSearch]);

  // Check if a driver called out today
  const isCallOut = (driverId: string) => {
    return todayCallOuts.some((co) => co.driver_id === driverId);
  };

  const getCallOutNote = (driverId: string) => {
    const callOut = todayCallOuts.find((co) => co.driver_id === driverId);
    return callOut?.note || null;
  };
  
  // Add off driver to today's schedule
  const addOffDriverToSchedule = (driverId: string, driverName: string) => {
    const driver = drivers.find(d => d.id === driverId);
    const defaultVehicle = (driver as any)?.default_vehicle;
    
    setAssigningDriver({ id: driverId, name: driverName });
    setAssignReportTime("");
    setAssignVehicle(defaultVehicle || "__none__");
    setShowAssignDialog(true);
    setOffDriverSearch("");
    // Focus report time after dialog opens
    setTimeout(() => {
      assignReportTimeRef.current?.focus();
    }, 50);
  };

  // Calculate stats based on displayed drivers
  const unassignedDrivers = displayDrivers.filter((d) => d.status === "unconfirmed").length;
  const assignedDrivers = displayDrivers.filter((d) => d.status === "confirmed").length;
  const workingDrivers = displayDrivers.filter((d) => d.status === "on_the_clock").length;
  const punchedOutDrivers = displayDrivers.filter((d) => d.status === "done").length;
  const offDriverCount = offDrivers.length;
  const calledOutCount = todayCallOuts.length;

  // Create section-based driver lists for keyboard navigation
  const driverSections = useMemo(() => {
    if (isToday) {
      return {
        assigned: displayDrivers.filter((d) => d.status === "confirmed"),
        unassigned: displayDrivers.filter((d) => d.status === "unconfirmed"),
        working: displayDrivers.filter((d) => d.status === "on_the_clock"),
        punchedOut: displayDrivers.filter((d) => d.status === "done"),
      };
    } else {
      return {
        unassigned: displayDrivers.filter(d => d.status === "unconfirmed"),
        assigned: displayDrivers.filter(d => d.status === "confirmed"),
        working: [],
        punchedOut: [],
      };
    }
  }, [displayDrivers, isToday]);

  // Section order for Tab navigation
  const sectionOrder = isToday 
    ? ["assigned", "unassigned", "working", "punchedOut"] as const
    : ["unassigned", "assigned"] as const;

  // Get current section for selected driver
  const getCurrentSection = useCallback((driverId: string | null) => {
    if (!driverId) return null;
    for (const section of sectionOrder) {
      if (driverSections[section]?.some(d => d.id === driverId)) {
        return section;
      }
    }
    return null;
  }, [driverSections, sectionOrder]);

  // Create ordered list of all selectable drivers for keyboard navigation
  const selectableDrivers = useMemo(() => {
    if (isToday) {
      // Today: Confirmed -> Unconfirmed -> On The Clock -> Done
      return [
        ...displayDrivers.filter((d) => d.status === "confirmed"),
        ...displayDrivers.filter((d) => d.status === "unconfirmed"),
        ...displayDrivers.filter((d) => d.status === "on_the_clock"),
        ...displayDrivers.filter((d) => d.status === "done"),
      ];
    } else {
      // Future: Unconfirmed -> Confirmed
      return [
        ...displayDrivers.filter(d => d.status === "unconfirmed"),
        ...displayDrivers.filter(d => d.status === "confirmed"),
      ];
    }
  }, [displayDrivers, isToday]);

  // Auto-select first unconfirmed driver on page load or when drivers change
  useEffect(() => {
    if (!loading && !schedulesLoading && selectableDrivers.length > 0) {
      // Only auto-select if no driver is currently selected or selected driver no longer exists
      if (!selectedDriverId || !selectableDrivers.find(d => d.id === selectedDriverId)) {
        // Prefer first unconfirmed driver
        const firstUnconfirmed = displayDrivers.find((d) => d.status === "unconfirmed");
        if (firstUnconfirmed) {
          setSelectedDriverId(firstUnconfirmed.id);
        } else if (selectableDrivers.length > 0) {
          setSelectedDriverId(selectableDrivers[0].id);
        }
      }
    }
  }, [loading, schedulesLoading, selectableDrivers, displayDrivers, selectedDriverId]);

  // Check if any modal/dialog is currently open
  const isAnyDialogOpen = showAssignDialog || showOffDialog || showPunchInDialog || showPunchOutDialog || showDriverPicker || showDetailsPanel;

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if focus is in an input, textarea, select, or contenteditable
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "SELECT" ||
      activeElement.getAttribute("contenteditable") === "true"
    );
    
    // Don't run shortcuts if any dialog is open (except for escape)
    const dialogOpen = showAssignDialog || showOffDialog || showPunchInDialog || showPunchOutDialog || showDriverPicker;
    
    // Escape closes any open panel/dialog
    if (e.key === "Escape") {
      if (showDetailsPanel) {
        e.preventDefault();
        setShowDetailsPanel(false);
        return;
      }
      // Let dialogs handle their own escape
      return;
    }
    
    // Don't process other shortcuts if dialog is open or input is focused
    if (dialogOpen || isInputFocused) return;
    
    // Arrow keys navigate in 4 directions within current section
    // Left/Right: move horizontally (prev/next in list)
    // Up/Down: move vertically (estimate row based on ~4 items per row)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      
      const currentSection = getCurrentSection(selectedDriverId);
      if (!currentSection) return;
      
      const sectionDrivers = driverSections[currentSection] || [];
      if (sectionDrivers.length === 0) return;
      
      const currentIndex = sectionDrivers.findIndex(d => d.id === selectedDriverId);
      if (currentIndex === -1) return;
      
      let newIndex: number = currentIndex;
      const itemsPerRow = 4; // Approximate number of items per row
      
      switch (e.key) {
        case "ArrowLeft":
          newIndex = currentIndex <= 0 ? sectionDrivers.length - 1 : currentIndex - 1;
          break;
        case "ArrowRight":
          newIndex = currentIndex >= sectionDrivers.length - 1 ? 0 : currentIndex + 1;
          break;
        case "ArrowUp":
          // Move up by one row (itemsPerRow items back)
          newIndex = currentIndex - itemsPerRow;
          if (newIndex < 0) {
            // Wrap to last row, try to maintain column position
            const totalRows = Math.ceil(sectionDrivers.length / itemsPerRow);
            const currentCol = currentIndex % itemsPerRow;
            const lastRowStart = (totalRows - 1) * itemsPerRow;
            newIndex = Math.min(lastRowStart + currentCol, sectionDrivers.length - 1);
          }
          break;
        case "ArrowDown":
          // Move down by one row (itemsPerRow items forward)
          newIndex = currentIndex + itemsPerRow;
          if (newIndex >= sectionDrivers.length) {
            // Wrap to first row, try to maintain column position
            const currentCol = currentIndex % itemsPerRow;
            newIndex = Math.min(currentCol, sectionDrivers.length - 1);
          }
          break;
      }
      
      if (sectionDrivers[newIndex]) {
        setSelectedDriverId(sectionDrivers[newIndex].id);
        setShowDetailsPanel(false);
      }
    }
    
    // Tab/Shift+Tab switches between sections
    if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const currentSection = getCurrentSection(selectedDriverId);
      const currentSectionIndex = currentSection ? sectionOrder.indexOf(currentSection as any) : -1;
      
      // Find next section with drivers
      const direction = e.shiftKey ? -1 : 1;
      let nextSectionIndex = currentSectionIndex;
      let attempts = 0;
      
      do {
        nextSectionIndex = (nextSectionIndex + direction + sectionOrder.length) % sectionOrder.length;
        attempts++;
      } while (
        (driverSections[sectionOrder[nextSectionIndex]]?.length || 0) === 0 && 
        attempts < sectionOrder.length
      );
      
      const nextSection = sectionOrder[nextSectionIndex];
      const nextSectionDrivers = driverSections[nextSection] || [];
      
      if (nextSectionDrivers.length > 0 && nextSection !== currentSection) {
        e.preventDefault();
        setSelectedDriverId(nextSectionDrivers[0].id);
        setShowDetailsPanel(false);
      }
    }
    
    // "V" key toggles driver details panel
    if ((e.key === "v" || e.key === "V") && selectedDriverId) {
      e.preventDefault();
      setShowDetailsPanel(prev => !prev);
    }
    
    // Enter key progresses driver through workflow
    if (e.key === "Enter" && selectedDriverId) {
      e.preventDefault();
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (!driver) return;
      
      switch (driver.status) {
        case "unconfirmed":
          // Unconfirmed → Open assign/confirm dialog
          executeAssign(selectedDriverId);
          break;
        case "confirmed":
          // Confirmed → Open punch-in dialog
          executePunchIn(selectedDriverId);
          break;
        case "on_the_clock":
          // On the clock → Open punch-out dialog
          executePunchOut(selectedDriverId);
          break;
        case "done":
          // Done → Show details panel
          setShowDetailsPanel(true);
          break;
      }
      return;
    }
    
    // === SHORTCUT KEYS (A, P, D, O) ===
    // Only work when not in future date mode (today only)
    if (!isToday) return;
    
    // Ctrl+Z or Cmd+Z → Undo last action
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      executeUndo();
      return;
    }
    
    // C → Confirm
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      if (!selectedDriverId) {
        setPendingAction("confirm");
        setShowDriverPicker(true);
      } else {
        executeAssign(selectedDriverId);
      }
    }
    
    // Shift+P → Quick Punch In (no dialog, uses current time and default vehicle)
    if (e.key === "P" && e.shiftKey && selectedDriverId) {
      e.preventDefault();
      executeQuickPunchIn(selectedDriverId);
      return;
    }
    
    // P → Punch In - always opens dialog, validates on submit
    if ((e.key === "p" || e.key === "P") && !e.shiftKey) {
      e.preventDefault();
      executePunchIn(selectedDriverId || undefined);
    }
    
    // D → Punch Out - always opens dialog, validates on submit
    if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      executePunchOut(selectedDriverId || undefined);
    }
    
    // O → Mark OFF
    if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      if (!selectedDriverId) {
        setPendingAction("off");
        setShowDriverPicker(true);
      } else {
        executeOff(selectedDriverId);
      }
    }
  }, [
    selectedDriverId, 
    showAssignDialog, 
    showOffDialog, 
    showDriverPicker, 
    showDetailsPanel, 
    getCurrentSection, 
    driverSections, 
    sectionOrder, 
    isToday,
    drivers,
    executeAssign, 
    executePunchIn, 
    executeQuickPunchIn,
    executePunchOut, 
    executeOff,
    executeUndo
  ]);

  // Handler for driver pill click - select and show details
  const handleDriverSelect = useCallback((driverId: string) => {
    setSelectedDriverId(driverId);
    setShowDetailsPanel(true);
  }, []);

  // Handler for confirming unconfirmed drivers with vehicles
  const handleConfirmDriver = useCallback(async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Store previous state for undo
    setLastAction({
      driverId: driver.id,
      driverName: driver.name,
      previousStatus: driver.status,
      previousVehicle: driver.vehicle,
      previousReportTime: driver.report_time,
      actionType: "confirm",
    });
    
    const { error } = await supabase
      .from("drivers")
      .update({ status: "confirmed" })
      .eq("id", driverId);
    
    if (error) {
      toast({
        title: "Error confirming driver",
        description: error.message,
        variant: "destructive",
      });
      setLastAction(null);
    } else {
      toast({
        title: "Driver confirmed",
        description: `${driver.name} has been confirmed`,
      });
    }
  }, [drivers, toast]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading || schedulesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading driver data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Driver Workbook
            </h1>
            <p className="text-sm text-muted-foreground">Manage driver status and assignments</p>
          </div>
          
          {/* Quick Action Toolbar - shows when driver is selected and on today */}
          <div className="flex items-center gap-2">
            {/* Undo Button */}
            {isToday && lastAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={executeUndo}
                className="gap-1.5"
                title={`Undo: ${lastAction.driverName} → ${lastAction.previousStatus} (Ctrl+Z)`}
              >
                <Undo2 className="h-4 w-4" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
            )}
            
            {isToday && selectedDriverId && (() => {
              const selectedDriver = drivers.find(d => d.id === selectedDriverId);
              if (!selectedDriver) return null;
              return (
                <DriverActionToolbar
                  driverName={selectedDriver.name}
                  status={selectedDriver.status}
                  onAssign={() => executeAssign(selectedDriverId)}
                  onPunchIn={() => executePunchIn(selectedDriverId)}
                  onQuickPunchIn={() => executeQuickPunchIn(selectedDriverId)}
                  onPunchOut={() => executePunchOut(selectedDriverId)}
                  onMarkOff={() => executeOff(selectedDriverId)}
                  onUnassign={() => executeUnassign(selectedDriverId)}
                  onReset={() => executeReset(selectedDriverId)}
                  onResetAll={executeResetAll}
                  onSimulateWorkflow={() => executeSimulateWorkflow(selectedDriverId)}
                  showTestingTools={true}
                />
              );
            })()}
          </div>
        </div>

        {/* Date Selector */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 min-w-[180px] justify-start">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {isToday ? "Today" : format(selectedDate, "EEE, MMM d, yyyy")}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(startOfDay(date));
                      }
                    }}
                    disabled={(date) => startOfDay(date) < today}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Day Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
                  disabled={isSameDay(selectedDate, today)}
                  title="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                  title="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Today Button */}
              {!isToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedDate(today)}
                >
                  Today
                </Button>
              )}
            </div>

            {isFutureDate && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                Showing {getAvailableDriversWithSchedule?.length || 0} scheduled drivers as unassigned
              </span>
            )}
          </div>
        </section>

        {/* Driver Status */}
        <section className="rounded-xl border border-border bg-card/30 p-6 mb-6 min-h-[500px]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Driver Workbook
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time driver status and assignments
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick Stats Pills */}
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 bg-slate-500/20 text-slate-400 px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  {unassignedDrivers} Unconfirmed
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {assignedDrivers} Confirmed
                </span>
                <span className="flex items-center gap-1.5 bg-status-active/20 text-status-active px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-active" />
                  {workingDrivers} Working
                </span>
                <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  {punchedOutDrivers} Done
                </span>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground">
                {displayDrivers.length} TOTAL
              </span>
            </div>
          </div>

          {isFutureDate ? (
            /* Future Date View - Two Column Layout */
            <div className="space-y-4">
              {/* CDL Filter for Future Dates */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">CDL Filter:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant={globalCdlFilter === "all" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setGlobalCdlFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={globalCdlFilter === "non-cdl" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setGlobalCdlFilter("non-cdl")}
                  >
                    Non-CDL
                  </Button>
                  <Button
                    variant={globalCdlFilter === "cdl" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setGlobalCdlFilter("cdl")}
                  >
                    CDL
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Scheduled/Unconfirmed */}
              <div className="space-y-2">
                <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                  <span>Scheduled</span>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                    {displayDrivers.filter(d => d.status === "unconfirmed").filter(d => {
                      if (globalCdlFilter === "cdl") return (d as any).has_cdl;
                      if (globalCdlFilter === "non-cdl") return !(d as any).has_cdl;
                      return true;
                    }).length}
                  </span>
                </h3>
                <div className="flex flex-col gap-1">
                  {displayDrivers
                    .filter(d => d.status === "unconfirmed")
                    .filter(d => {
                      if (globalCdlFilter === "cdl") return (d as any).has_cdl;
                      if (globalCdlFilter === "non-cdl") return !(d as any).has_cdl;
                      return true;
                    })
                    .map((driver) => (
                      <div
                        key={driver.id}
                        className={cn(
                          "flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-sm transition-all duration-200 group",
                          isAdmin && "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5",
                          selectedDriverId === driver.id && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                        )}
                        onClick={() => {
                          handleDriverSelect(driver.id);
                          if (isAdmin) openAssignDialog(driver.id, driver.name);
                        }}
                      >
                        <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                        <span className="font-medium text-foreground flex-1">{driver.name}</span>
                        {(driver as any).has_cdl && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                        )}
                        {(driver as any).schedule && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>
                              {(driver as any).schedule.start_time?.slice(0, 5) || "--:--"}
                            </span>
                          </div>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            title="Mark OFF"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOffFutureDriver(driver.id, driver.name);
                            }}
                          >
                            <PhoneOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  {displayDrivers.filter(d => d.status === "unconfirmed").length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers scheduled for this day</p>
                  )}
                </div>
              </div>

              {/* Right Column - Confirmed */}
              <div className="space-y-2">
                <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                  <span>Confirmed</span>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                    {displayDrivers.filter(d => d.status === "confirmed").filter(d => {
                      if (globalCdlFilter === "cdl") return (d as any).has_cdl;
                      if (globalCdlFilter === "non-cdl") return !(d as any).has_cdl;
                      return true;
                    }).length}
                  </span>
                </h3>
                <div className="flex flex-col gap-1">
                  {displayDrivers
                    .filter(d => d.status === "confirmed")
                    .filter(d => {
                      if (globalCdlFilter === "cdl") return (d as any).has_cdl;
                      if (globalCdlFilter === "non-cdl") return !(d as any).has_cdl;
                      return true;
                    })
                    .map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => handleDriverSelect(driver.id)}
                        className={cn(
                          "flex items-center gap-3 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm group cursor-pointer transition-all duration-200",
                          selectedDriverId === driver.id && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-foreground flex-1">{driver.name}</span>
                        {(driver as any).has_cdl && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                        )}
                        {(driver as any).report_time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{(driver as any).report_time.slice(0, 5)}</span>
                          </div>
                        )}
                        {driver.vehicle && (
                          <div className="flex items-center gap-1 text-xs text-primary font-mono">
                            <Truck className="h-3 w-3" />
                            <span>{driver.vehicle}</span>
                          </div>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassignFutureDriver(driver.id, driver.name);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  {displayDrivers.filter(d => d.status === "confirmed").length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers confirmed yet</p>
                  )}
                </div>
              </div>
              </div>
              {/* OFF Drivers Section for Future Dates */}
              {selectedDateCallOuts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                    <span className="flex items-center gap-2">
                      <PhoneOff className="h-4 w-4 text-destructive" />
                      OFF
                    </span>
                    <span className="rounded bg-destructive/20 text-destructive px-2 py-0.5 font-mono text-xs">
                      {selectedDateCallOuts.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedDateCallOuts.map((callOut) => {
                      const driver = drivers.find(d => d.id === callOut.driver_id);
                      return (
                        <div
                          key={callOut.id}
                          className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm group"
                        >
                          <span className="h-2 w-2 rounded-full bg-status-offline shrink-0" />
                          <span className="font-medium text-foreground">{callOut.driver_name}</span>
                          {driver?.has_cdl && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                          )}
                          {callOut.note && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[120px]" title={callOut.note}>
                              {callOut.note}
                            </span>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                              title="Remove OFF status"
                              onClick={() => handleRemoveOffFutureDriver(callOut.driver_id, callOut.driver_name)}
                            >
                              <Undo2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Today View - Modern Workbook Panel */
            <div className="space-y-4">
              {/* Global CDL Filter */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">CDL Filter:</span>
                <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
                  <Button
                    variant={globalCdlFilter === "all" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs rounded-md"
                    onClick={() => setGlobalCdlFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={globalCdlFilter === "non-cdl" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs rounded-md"
                    onClick={() => setGlobalCdlFilter("non-cdl")}
                  >
                    Non-CDL
                  </Button>
                  <Button
                    variant={globalCdlFilter === "cdl" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs rounded-md"
                    onClick={() => setGlobalCdlFilter("cdl")}
                  >
                    CDL
                  </Button>
                </div>
              </div>

              {/* New Workbook Panel */}
              <DriverWorkbookPanel
                drivers={displayDrivers.map(d => ({
                  ...d,
                  shiftData: (d as any).shiftData || null,
                }))}
                selectedDriverId={selectedDriverId}
                recentlyUpdatedDrivers={recentlyUpdatedDrivers}
                onDriverSelect={handleDriverSelect}
                onConfirmDriver={handleConfirmDriver}
                cdlFilter={globalCdlFilter}
                isAdmin={isAdmin}
              />

              {/* OFF Drivers - Collapsible */}
              <Collapsible open={offDriversOpen} onOpenChange={setOffDriversOpen} className="mt-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2.5 hover:bg-card/80 transition-colors cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", !offDriversOpen && "-rotate-90")} />
                    <PhoneOff className="h-4 w-4" />
                    OFF / Not Scheduled
                    {calledOutCount > 0 && (
                      <span className="rounded-full bg-destructive/20 text-destructive px-2 py-0.5 font-mono text-xs">
                        {calledOutCount} called out
                      </span>
                    )}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {offDriverCount}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  {/* Search box for off drivers */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search off drivers..."
                      value={offDriverSearch}
                      onChange={(e) => setOffDriverSearch(e.target.value)}
                      className="h-9 pl-9 pr-9 text-sm bg-background/50 rounded-lg"
                    />
                    {offDriverSearch && (
                      <button
                        onClick={() => setOffDriverSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                    {filteredOffDrivers.map((driver) => {
                      const calledOut = isCallOut(driver.id);
                      const note = getCallOutNote(driver.id);
                      return (
                        <div
                          key={driver.id}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm transition-all duration-200",
                            calledOut ? "border-destructive/30 bg-destructive/5" : "border-border hover:border-primary/30"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground flex-1 truncate">{driver.name}</span>
                          {(driver as any).has_cdl && (
                            <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded uppercase">CDL</span>
                          )}
                          {calledOut && (
                            <span className="flex items-center gap-1 text-destructive" title={note || "Called out"}>
                              <PhoneOff className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-medium">Called Out</span>
                            </span>
                          )}
                          {/* Add to schedule button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addOffDriverToSchedule(driver.id, driver.name)}
                            className="h-7 px-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                            title="Add to today's schedule"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Add</span>
                          </Button>
                        </div>
                      );
                    })}
                    {filteredOffDrivers.length === 0 && offDriverSearch && (
                      <p className="text-sm text-muted-foreground italic py-4 col-span-2 text-center">No matching drivers</p>
                    )}
                    {offDriverCount === 0 && !offDriverSearch && (
                      <p className="text-sm text-muted-foreground italic py-4 col-span-2 text-center">No OFF drivers</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </section>

        {/* Stats Overview - Collapsible */}
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2 hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Stats Overview</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Unassigned"
                value={unassignedDrivers}
                subtitle="Waiting"
                icon={Users}
                accentColor="accent"
              />
              <StatsCard
                title="Assigned"
                value={assignedDrivers}
                subtitle="Ready"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="Working"
                value={workingDrivers}
                subtitle="Active"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="Punched Out"
                value={punchedOutDrivers}
                subtitle="Done"
                icon={Users}
                accentColor="accent"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </main>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Assign for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
          <div className="grid gap-4 py-4">
            {/* Driver - First visually, but skipped in first tab cycle */}
            <div className="grid gap-2">
              <Label htmlFor="assign-driver">Driver</Label>
              <Select 
                value={assigningDriver?.id || ""} 
                onValueChange={(val) => {
                  const driver = drivers.find(d => d.id === val);
                  if (driver) {
                    const defaultVehicle = (driver as any)?.default_vehicle;
                    setAssigningDriver({ id: driver.id, name: driver.name });
                    setAssignVehicle(defaultVehicle || "__none__");
                  }
                }}
              >
                <SelectTrigger 
                  ref={assignDriverSelectRef}
                  id="assign-driver"
                  tabIndex={-1}
                >
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {drivers
                    .filter((d) => d.is_active)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* Report Time - First in tab order (focus starts here) */}
            <div className="grid gap-2">
              <Label htmlFor="future-report-time">Report Time (optional)</Label>
              <TimeInput
                ref={assignReportTimeRef}
                id="future-report-time"
                value={assignReportTime}
                onChange={setAssignReportTime}
                placeholder="HH:MM"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    assignButtonRef.current?.focus();
                  }
                }}
              />
            </div>
            {/* Vehicle - Second in tab order */}
            <div className="grid gap-2">
              <Label htmlFor="future-vehicle">Vehicle (optional)</Label>
              <VehicleCombobox
                vehicles={vehicles.filter((v) => v.status === "active")}
                value={assignVehicle}
                onValueChange={setAssignVehicle}
                placeholder="No vehicle"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAssignDialog(false)}
              tabIndex={-1}
            >
              Cancel
            </Button>
            <Button 
              ref={assignButtonRef}
              onClick={handleAssignDriver}
              disabled={!assigningDriver}
              onKeyDown={(e) => {
                // Tab from Assign cycles to Driver field
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  assignDriverSelectRef.current?.focus();
                }
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OFF Dialog */}
      <Dialog open={showOffDialog} onOpenChange={setShowOffDialog}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Mark Driver OFF</DialogTitle>
            <DialogDescription>
              Did the driver call out?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="off-driver">Driver</Label>
              <Select 
                value={offDriver?.id || ""} 
                onValueChange={(val) => {
                  const driver = drivers.find(d => d.id === val);
                  if (driver) {
                    setOffDriver({ id: driver.id, name: driver.name });
                  }
                }}
              >
                <SelectTrigger id="off-driver">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.is_active && d.status !== "on_the_clock")
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Schedule OFF for future dates (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {offDates.length > 0 
                      ? `${offDates.length} date${offDates.length > 1 ? "s" : ""} selected`
                      : "Select future dates"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={offDates}
                    onSelect={(dates) => setOffDates(dates || [])}
                    disabled={(date) => date < today}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {offDates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {offDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                      >
                        {format(date, "EEE, MMM d")}
                        <button
                          type="button"
                          onClick={() => setOffDates(offDates.filter(d => !isSameDay(d, date)))}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {offDates.length === 0 
                  ? "Leave empty to mark OFF for today only"
                  : offDates.some(d => isSameDay(d, today))
                    ? "Today is included - driver status will change now"
                    : "Future dates only - driver status won't change today"
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="call-out-page"
                checked={isCallOutChecked}
                onCheckedChange={(checked) => setIsCallOutChecked(checked === true)}
              />
              <Label htmlFor="call-out-page" className="text-sm font-normal">
                Yes, driver called out
              </Label>
            </div>
            {isCallOutChecked && (
              <div className="grid gap-2">
                <Label htmlFor="call-out-note-page">Note (optional)</Label>
                <Textarea
                  id="call-out-note-page"
                  placeholder="Reason for call out..."
                  value={callOutNote}
                  onChange={(e) => setCallOutNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOffDialog(false);
              setOffDates([]);
            }} tabIndex={-1}>
              Cancel
            </Button>
            <Button onClick={handleConfirmOff} disabled={!offDriver}>
              Confirm OFF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Punch In Dialog */}
      <Dialog 
        open={showPunchInDialog} 
        onOpenChange={(open) => {
          setShowPunchInDialog(open);
          if (!open) {
            setPunchInDriver(null);
            setPunchInTabStage(1);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-[350px]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setPunchInTabStage(1);
            // Smart focus: if vehicle is already assigned, skip to time
            setTimeout(() => {
              const hasVehicle = punchInVehicle && punchInVehicle !== "__none__";
              if (hasVehicle) {
                punchInTimeRef.current?.focus();
                punchInTimeRef.current?.select();
              } else {
                punchInVehicleRef.current?.focus();
              }
            }, 0);
          }}
          onKeyDown={(e) => {
            const hasVehicle = punchInVehicle && punchInVehicle !== "__none__";
            const activeEl = document.activeElement;
            
            // Handle Tab key navigation
            if (e.key === "Tab") {
              // Stage 1: Minimal loop
              if (punchInTabStage === 1) {
                if (!e.shiftKey) {
                  // Forward Tab
                  if (activeEl === punchInButtonRef.current) {
                    // Tab past Punch In → Switch to Stage 2, go to Driver
                    e.preventDefault();
                    setPunchInTabStage(2);
                    punchInDriverRef.current?.focus();
                  } else if (activeEl === punchInTimeRef.current) {
                    // Time → Punch In (skip Driver/Vehicle in Stage 1)
                    e.preventDefault();
                    punchInButtonRef.current?.focus();
                  } else if (activeEl === punchInVehicleRef.current && !hasVehicle) {
                    // Vehicle → Time (only if vehicle field is in the loop)
                    e.preventDefault();
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  }
                } else {
                  // Shift+Tab in Stage 1
                  if (activeEl === punchInTimeRef.current) {
                    if (hasVehicle) {
                      // If vehicle assigned, Time is first field - wrap to Punch In
                      e.preventDefault();
                      punchInButtonRef.current?.focus();
                    } else {
                      // Vehicle not assigned, go to Vehicle
                      e.preventDefault();
                      punchInVehicleRef.current?.focus();
                    }
                  } else if (activeEl === punchInVehicleRef.current) {
                    // Vehicle is first field in Stage 1 when no vehicle - wrap to Punch In
                    e.preventDefault();
                    punchInButtonRef.current?.focus();
                  } else if (activeEl === punchInButtonRef.current) {
                    // Punch In → Time
                    e.preventDefault();
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  }
                }
              } else {
                // Stage 2: Full cycle (Driver → Vehicle → Time → Punch In → Driver)
                if (!e.shiftKey) {
                  // Forward Tab in Stage 2
                  if (activeEl === punchInButtonRef.current) {
                    // Punch In → Driver (wrap)
                    e.preventDefault();
                    punchInDriverRef.current?.focus();
                  } else if (activeEl === punchInDriverRef.current) {
                    // Driver → Vehicle
                    e.preventDefault();
                    punchInVehicleRef.current?.focus();
                  } else if (activeEl === punchInVehicleRef.current) {
                    // Vehicle → Time
                    e.preventDefault();
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  } else if (activeEl === punchInTimeRef.current) {
                    // Time → Punch In
                    e.preventDefault();
                    punchInButtonRef.current?.focus();
                  }
                } else {
                  // Shift+Tab in Stage 2 (reverse)
                  if (activeEl === punchInDriverRef.current) {
                    // Driver → Punch In (wrap backwards)
                    e.preventDefault();
                    punchInButtonRef.current?.focus();
                  } else if (activeEl === punchInVehicleRef.current) {
                    // Vehicle → Driver
                    e.preventDefault();
                    punchInDriverRef.current?.focus();
                  } else if (activeEl === punchInTimeRef.current) {
                    // Time → Vehicle
                    e.preventDefault();
                    punchInVehicleRef.current?.focus();
                  } else if (activeEl === punchInButtonRef.current) {
                    // Punch In → Time
                    e.preventDefault();
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  }
                }
              }
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Punch In Driver</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="punch-in-driver">Driver</Label>
              <Select 
                value={punchInDriver?.id || ""} 
                onValueChange={(val) => {
                  const driver = drivers.find(d => d.id === val);
                  if (driver) {
                    setPunchInDriver({ id: driver.id, name: driver.name });
                    const newVehicle = getDriverDefaultVehicle(driver.id);
                    setPunchInVehicle(newVehicle);
                    // Reset to Stage 1 when driver changes
                    setPunchInTabStage(1);
                    // Re-focus based on new vehicle state
                    setTimeout(() => {
                      if (newVehicle && newVehicle !== "__none__") {
                        punchInTimeRef.current?.focus();
                        punchInTimeRef.current?.select();
                      } else {
                        punchInVehicleRef.current?.focus();
                      }
                    }, 0);
                  }
                }}
              >
                <SelectTrigger id="punch-in-driver" ref={punchInDriverRef} tabIndex={punchInTabStage === 2 ? 0 : -1}>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.is_active)
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                        {driver.status !== "confirmed" && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({driver.status})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="punch-in-vehicle" className={
                punchInDriver && drivers.find(d => d.id === punchInDriver.id)?.status === "unconfirmed"
                  ? "text-amber-400 font-medium"
                  : ""
              }>
                Vehicle {punchInDriver && drivers.find(d => d.id === punchInDriver.id)?.status === "unconfirmed" && (
                  <span className="text-amber-400 text-xs ml-1">(required)</span>
                )}
              </Label>
              <Select 
                value={punchInVehicle} 
                onValueChange={(val) => {
                  setPunchInVehicle(val);
                  // After vehicle selection, move focus to time
                  setTimeout(() => {
                    punchInTimeRef.current?.focus();
                    punchInTimeRef.current?.select();
                  }, 0);
                }}
              >
                <SelectTrigger 
                  id="punch-in-vehicle"
                  ref={punchInVehicleRef}
                  tabIndex={punchInTabStage === 2 || (punchInVehicle === "__none__" || !punchInVehicle) ? 0 : -1}
                  className={
                    punchInDriver && drivers.find(d => d.id === punchInDriver.id)?.status === "unconfirmed" && (punchInVehicle === "__none__" || !punchInVehicle)
                      ? "ring-2 ring-amber-400 border-amber-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No vehicle</SelectItem>
                  {vehicles
                    .filter((v) => v.status === "active")
                    .map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.unit}>
                        {vehicle.unit}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="punch-in-time">Time</Label>
              <TimeInput
                id="punch-in-time"
                ref={punchInTimeRef}
                value={punchInTime}
                onChange={setPunchInTime}
                onEnterSubmit={handleConfirmPunchIn}
                placeholder="e.g. 930, 9:30am, 21:30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchInDialog(false)} tabIndex={-1}>
              Cancel
            </Button>
            <Button ref={punchInButtonRef} onClick={handleConfirmPunchIn} disabled={!punchInDriver}>
              Punch In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Punch Out Dialog */}
      <Dialog 
        open={showPunchOutDialog} 
        onOpenChange={(open) => {
          setShowPunchOutDialog(open);
          if (!open) {
            setPunchOutDriver(null);
            setPunchOutTabStage(1);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-[350px]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setPunchOutTabStage(1);
            // If driver is pre-selected, focus time; otherwise focus driver
            setTimeout(() => {
              if (punchOutDriver) {
                punchOutTimeRef.current?.focus();
                punchOutTimeRef.current?.select();
              } else {
                punchOutDriverRef.current?.focus();
              }
            }, 0);
          }}
          onKeyDown={(e) => {
            const hasDriver = !!punchOutDriver;
            const activeEl = document.activeElement;
            
            // Handle Tab key navigation
            if (e.key === "Tab") {
              // Stage 1: Minimal loop
              if (punchOutTabStage === 1) {
                if (!e.shiftKey) {
                  // Forward Tab
                  if (activeEl === punchOutButtonRef.current) {
                    // Tab past Punch Out → Switch to Stage 2, go to Driver
                    e.preventDefault();
                    setPunchOutTabStage(2);
                    punchOutDriverRef.current?.focus();
                  } else if (activeEl === punchOutTimeRef.current) {
                    // Time → Punch Out
                    e.preventDefault();
                    punchOutButtonRef.current?.focus();
                  } else if (activeEl === punchOutDriverRef.current && !hasDriver) {
                    // Driver → Time (only if driver field is in the loop initially)
                    e.preventDefault();
                    punchOutTimeRef.current?.focus();
                    punchOutTimeRef.current?.select();
                  }
                } else {
                  // Shift+Tab in Stage 1
                  if (activeEl === punchOutTimeRef.current) {
                    if (hasDriver) {
                      // If driver pre-selected, Time is first field - wrap to Punch Out
                      e.preventDefault();
                      punchOutButtonRef.current?.focus();
                    } else {
                      // Driver not pre-selected, go to Driver
                      e.preventDefault();
                      punchOutDriverRef.current?.focus();
                    }
                  } else if (activeEl === punchOutDriverRef.current) {
                    // Driver is first field - wrap to Punch Out
                    e.preventDefault();
                    punchOutButtonRef.current?.focus();
                  } else if (activeEl === punchOutButtonRef.current) {
                    // Punch Out → Time
                    e.preventDefault();
                    punchOutTimeRef.current?.focus();
                    punchOutTimeRef.current?.select();
                  }
                }
              } else {
                // Stage 2: Full cycle (Driver → Time → Punch Out → Driver)
                if (!e.shiftKey) {
                  // Forward Tab in Stage 2
                  if (activeEl === punchOutButtonRef.current) {
                    // Punch Out → Driver (wrap)
                    e.preventDefault();
                    punchOutDriverRef.current?.focus();
                  } else if (activeEl === punchOutDriverRef.current) {
                    // Driver → Time
                    e.preventDefault();
                    punchOutTimeRef.current?.focus();
                    punchOutTimeRef.current?.select();
                  } else if (activeEl === punchOutTimeRef.current) {
                    // Time → Punch Out
                    e.preventDefault();
                    punchOutButtonRef.current?.focus();
                  }
                } else {
                  // Shift+Tab in Stage 2 (reverse)
                  if (activeEl === punchOutDriverRef.current) {
                    // Driver → Punch Out (wrap backwards)
                    e.preventDefault();
                    punchOutButtonRef.current?.focus();
                  } else if (activeEl === punchOutTimeRef.current) {
                    // Time → Driver
                    e.preventDefault();
                    punchOutDriverRef.current?.focus();
                  } else if (activeEl === punchOutButtonRef.current) {
                    // Punch Out → Time
                    e.preventDefault();
                    punchOutTimeRef.current?.focus();
                    punchOutTimeRef.current?.select();
                  }
                }
              }
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Punch Out Driver</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="punch-out-driver">Driver</Label>
              <Select 
                value={punchOutDriver?.id || ""} 
                onValueChange={(val) => {
                  const driver = drivers.find(d => d.id === val);
                  if (driver) {
                    setPunchOutDriver({ id: driver.id, name: driver.name });
                    // Reset to Stage 1 when driver changes
                    setPunchOutTabStage(1);
                    // Focus time after driver selection
                    setTimeout(() => {
                      punchOutTimeRef.current?.focus();
                      punchOutTimeRef.current?.select();
                    }, 0);
                  }
                }}
              >
                <SelectTrigger id="punch-out-driver" ref={punchOutDriverRef} tabIndex={punchOutTabStage === 2 || !punchOutDriver ? 0 : -1}>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.is_active)
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                        {!["working", "on-route"].includes(driver.status) && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({driver.status})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* Display current vehicle as read-only */}
            {punchOutDriver && (() => {
              const driver = drivers.find(d => d.id === punchOutDriver.id);
              const vehicleUnit = driver?.vehicle;
              return vehicleUnit ? (
                <div className="grid gap-2">
                  <Label className="text-muted-foreground text-xs">Vehicle</Label>
                  <div className="text-sm font-medium px-3 py-2 rounded-md bg-muted/50">
                    {vehicleUnit}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="grid gap-2">
              <Label htmlFor="punch-out-time">Time</Label>
              <TimeInput
                id="punch-out-time"
                ref={punchOutTimeRef}
                value={punchOutTime}
                onChange={setPunchOutTime}
                onEnterSubmit={handleConfirmPunchOut}
                placeholder="e.g. 530, 5:30pm, 17:30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchOutDialog(false)} tabIndex={-1}>
              Cancel
            </Button>
            <Button ref={punchOutButtonRef} onClick={handleConfirmPunchOut} disabled={!punchOutDriver}>
              Punch Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off Driver Assignment Confirmation */}
      <Dialog open={showOffDriverConfirm} onOpenChange={setShowOffDriverConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign OFF Driver?</DialogTitle>
            <DialogDescription>
              <strong>{pendingOffDriver?.name}</strong> is currently marked as OFF for today. Are you sure you want to bring them in and assign them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowOffDriverConfirm(false);
              setPendingOffDriver(null);
            }}>
              Cancel
            </Button>
            <Button onClick={confirmOffDriverAssign}>
              Yes, Assign Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Picker for keyboard shortcuts */}
      <DriverPicker
        open={showDriverPicker}
        onOpenChange={(open) => {
          setShowDriverPicker(open);
          if (!open) setPendingAction(null);
        }}
        drivers={selectableDrivers}
        onSelect={handleDriverPickerSelect}
        title={
          pendingAction === "confirm" ? "Select Driver to Confirm" :
          pendingAction === "off" ? "Select Driver to Mark OFF" :
          "Select Driver"
        }
      />

      {/* Quick Vehicle Picker for Shift+P */}
      <QuickVehiclePickerDialog
        open={showQuickVehiclePicker}
        onOpenChange={(open) => {
          setShowQuickVehiclePicker(open);
          if (!open) setQuickPunchInDriver(null);
        }}
        driverName={quickPunchInDriver?.name || ""}
        vehicles={vehicles}
        onConfirm={handleQuickVehicleSelect}
      />

      {/* Driver Details Panel */}
      <DriverDetailsPanel 
        driver={showDetailsPanel && selectedDriverId ? drivers.find(d => d.id === selectedDriverId) || null : null}
        onClose={() => setShowDetailsPanel(false)}
      />
    </div>
  );
};

export default Drivers;
