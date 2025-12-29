import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Users, BarChart3, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, Clock, PhoneOff, Truck, X } from "lucide-react";
import { format, addDays, isSameDay, startOfDay, getDay } from "date-fns";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { DriverDetailsPanel } from "@/components/DriverDetailsPanel";
import { DriverPicker } from "@/components/DriverPicker";
import { DriverActionToolbar } from "@/components/DriverActionToolbar";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  const [schedules, setSchedules] = useState<DriverSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [todayCallOuts, setTodayCallOuts] = useState<CallOut[]>([]);
  const [offDriversOpen, setOffDriversOpen] = useState(false);
  const [futureAssignments, setFutureAssignments] = useState<FutureAssignment[]>([]);
  
  // Selected driver state
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  
  // Assign dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState<{ id: string; name: string } | null>(null);
  const [assignReportTime, setAssignReportTime] = useState("");
  const [assignVehicle, setAssignVehicle] = useState("__none__");
  const assignButtonRef = useRef<HTMLButtonElement>(null);
  const driverListRef = useRef<HTMLDivElement>(null);
  
  // OFF dialog state
  const [showOffDialog, setShowOffDialog] = useState(false);
  const [offDriver, setOffDriver] = useState<{ id: string; name: string } | null>(null);
  const [isCallOutChecked, setIsCallOutChecked] = useState(false);
  const [callOutNote, setCallOutNote] = useState("");
  
  // Punch In dialog state
  const [showPunchInDialog, setShowPunchInDialog] = useState(false);
  const [punchInDriver, setPunchInDriver] = useState<{ id: string; name: string } | null>(null);
  const [punchInTime, setPunchInTime] = useState("");
  const [punchInVehicle, setPunchInVehicle] = useState<string>("__none__");
  const punchInSelectRef = useRef<HTMLButtonElement>(null);
  
  // Punch Out dialog state
  const [showPunchOutDialog, setShowPunchOutDialog] = useState(false);
  const [punchOutDriver, setPunchOutDriver] = useState<{ id: string; name: string } | null>(null);
  const [punchOutTime, setPunchOutTime] = useState("");
  const punchOutSelectRef = useRef<HTMLButtonElement>(null);
  
  // Driver picker state (for keyboard shortcuts when no driver selected)
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<"assign" | "off" | null>(null);

  const today = startOfDay(new Date());
  const isToday = isSameDay(selectedDate, today);
  const isFutureDate = selectedDate > today;

  // Generate week days based on offset
  const weekDays = useMemo(() => {
    const startDate = addDays(today, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [weekOffset]);

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

  // Fetch future assignments when selected date changes
  useEffect(() => {
    if (!isFutureDate) {
      setFutureAssignments([]);
      return;
    }
    
    const fetchFutureAssignments = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("future_assignments")
        .select("*")
        .eq("assignment_date", dateStr);
      
      if (!error && data) {
        setFutureAssignments(data as FutureAssignment[]);
      }
    };
    
    fetchFutureAssignments();
  }, [selectedDate, isFutureDate]);

  // Get drivers available on selected date based on their schedule
  const getAvailableDriversWithSchedule = useMemo(() => {
    if (isToday) {
      return null; // Use actual driver statuses for today
    }

    // day_of_week: 0 = Sunday, 1 = Monday, etc.
    const dayOfWeek = getDay(selectedDate);
    
    // Find schedules for this day that are NOT marked as off
    const scheduleMap = new Map<string, { start_time: string | null; end_time: string | null }>();
    
    schedules.forEach((schedule) => {
      if (schedule.day_of_week === dayOfWeek && !schedule.is_off) {
        scheduleMap.set(schedule.driver_id, {
          start_time: schedule.start_time,
          end_time: schedule.end_time,
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
  const displayDrivers = useMemo(() => {
    if (isToday) {
      return drivers.map((d) => ({ ...d, schedule: null as { start_time: string | null; end_time: string | null } | null }));
    }
    
    // Create a map of assigned driver IDs
    const assignedMap = new Map(futureAssignments.map(a => [a.driver_id, a]));
    
    // For future dates, return available drivers with their assignment status
    return (getAvailableDriversWithSchedule || []).map((driver) => {
      const assignment = assignedMap.get(driver.id);
      if (assignment) {
        return {
          ...driver,
          status: "assigned" as const,
          vehicle: assignment.vehicle,
          report_time: assignment.report_time,
        };
      }
      return {
        ...driver,
        status: "unassigned" as const,
        vehicle: null,
        report_time: null,
      };
    });
  }, [isToday, getAvailableDriversWithSchedule, drivers, futureAssignments]);

  // Handler for assigning a driver
  const handleAssignDriver = async () => {
    if (!assigningDriver) return;
    
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
      } else if (data) {
        toast({
          title: "Driver assigned",
          description: `${assigningDriver.name} assigned for ${format(selectedDate, "EEEE, MMM d")}`,
        });
        setFutureAssignments([...futureAssignments, data as FutureAssignment]);
      }
    } else {
      // Today: update driver status directly
      const vehicleValue = assignVehicle === "__none__" ? undefined : assignVehicle;
      await updateDriverStatus(assigningDriver.id, "assigned", assignReportTime || undefined, vehicleValue);
      toast({
        title: "Driver assigned",
        description: `${assigningDriver.name} has been assigned`,
      });
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

  const openAssignDialog = (driverId: string, driverName: string) => {
    const driver = drivers.find(d => d.id === driverId);
    const defaultVehicle = (driver as any)?.default_vehicle;
    
    setAssigningDriver({ id: driverId, name: driverName });
    setAssignReportTime("");
    // Pre-fill with driver's default/take-home vehicle if set
    setAssignVehicle(defaultVehicle || "__none__");
    setShowAssignDialog(true);
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
    
    // If it's a call out, record it
    if (isCallOutChecked) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("call_outs").insert({
        driver_id: offDriver.id,
        driver_name: offDriver.name,
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
          description: `${offDriver.name} marked as called out`,
        });
        // Refresh call outs
        const { data: callOutsRes } = await supabase
          .from("call_outs")
          .select("*")
          .eq("call_out_date", format(today, "yyyy-MM-dd"));
        if (callOutsRes) {
          setTodayCallOuts(callOutsRes as CallOut[]);
        }
      }
    }

    updateDriverStatus(offDriver.id, "off");
    setShowOffDialog(false);
    setOffDriver(null);
    setIsCallOutChecked(false);
    setCallOutNote("");
  };

  // Shortcut action handlers with guardrails
  const executeAssign = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    // Allow from unassigned, scheduled, or assigned
    if (["unassigned", "scheduled", "assigned"].includes(driver.status)) {
      openAssignDialog(driver.id, driver.name);
    } else if (["working", "on-route"].includes(driver.status)) {
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

  const handleConfirmPunchIn = () => {
    if (!punchInDriver) return;
    
    const driver = drivers.find(d => d.id === punchInDriver.id);
    if (!driver) return;
    
    // Validate on submit
    if (["working", "on-route"].includes(driver.status)) {
      toast({
        title: "Already punched in",
        description: `${driver.name} is already on the clock`,
      });
      setShowPunchInDialog(false);
      setPunchInDriver(null);
      return;
    }
    
    if (driver.status !== "assigned") {
      toast({
        title: "Cannot punch in",
        description: "Driver must be assigned first",
        variant: "destructive",
      });
      return; // Keep dialog open so user can select a different driver
    }
    
    const vehicleToAssign = punchInVehicle === "__none__" ? undefined : punchInVehicle;
    updateDriverStatus(punchInDriver.id, "working", undefined, vehicleToAssign, punchInTime);
    toast({
      title: "Punched In",
      description: `${punchInDriver.name} is now working`,
    });
    setShowPunchInDialog(false);
    setPunchInDriver(null);
    setPunchInTime("");
    setPunchInVehicle("__none__");
  };

  const handleConfirmPunchOut = async () => {
    if (!punchOutDriver) return;
    
    const driver = drivers.find(d => d.id === punchOutDriver.id);
    if (!driver) return;
    
    // Validate on submit - must be working to punch out
    if (!["working", "on-route"].includes(driver.status)) {
      toast({
        title: "Cannot punch out",
        description: `${driver.name} must be working to punch out`,
        variant: "destructive",
      });
      return; // Keep dialog open so user can select a different driver
    }
    
    // Validate punch-out time is after punch-in time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const { data: todayPunches } = await supabase
      .from("time_punches")
      .select("punch_type, punch_time")
      .eq("driver_id", punchOutDriver.id)
      .gte("punch_time", todayStart.toISOString())
      .lte("punch_time", todayEnd.toISOString())
      .order("punch_time", { ascending: false });
    
    // Find the most recent punch-in for today
    const lastPunchIn = todayPunches?.find(p => p.punch_type === "in");
    
    if (lastPunchIn && punchOutTime) {
      const punchInDate = new Date(lastPunchIn.punch_time);
      const punchInMinutes = punchInDate.getHours() * 60 + punchInDate.getMinutes();
      
      const [outHours, outMinutes] = punchOutTime.split(":").map(Number);
      const punchOutMinutes = outHours * 60 + outMinutes;
      
      if (punchOutMinutes < punchInMinutes) {
        const punchInTimeStr = `${punchInDate.getHours().toString().padStart(2, "0")}:${punchInDate.getMinutes().toString().padStart(2, "0")}`;
        toast({
          title: "Invalid punch-out time",
          description: `Punch-out time (${punchOutTime}) cannot be before punch-in time (${punchInTimeStr})`,
          variant: "destructive",
        });
        return;
      }
    }
    
    updateDriverStatus(punchOutDriver.id, "punched-out", undefined, undefined, punchOutTime);
    toast({
      title: "Punched Out",
      description: `${punchOutDriver.name} has punched out`,
    });
    setShowPunchOutDialog(false);
    setPunchOutDriver(null);
    setPunchOutTime("");
  };

  const executeOff = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    if (driver.status === "off") {
      toast({
        title: "Already OFF",
        description: `${driver.name} is already marked OFF`,
      });
      return;
    }
    
    if (["working", "on-route"].includes(driver.status)) {
      toast({
        title: "Driver is working",
        description: "Punch out first before marking OFF",
        variant: "destructive",
      });
      return;
    }
    
    openOffDialog(driver.id, driver.name);
  }, [drivers, toast]);

  // Unassign - reset to unassigned
  const executeUnassign = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    if (driver.status !== "assigned") {
      toast({
        title: "Cannot unassign",
        description: `Driver is not currently assigned`,
        variant: "destructive",
      });
      return;
    }
    
    updateDriverStatus(driverId, "unassigned");
    toast({
      title: "Driver unassigned",
      description: `${driver.name} has been unassigned`,
    });
  }, [drivers, updateDriverStatus, toast]);

  // Reset - set back to unassigned from punched-out/off
  const executeReset = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    
    updateDriverStatus(driverId, "unassigned");
    toast({
      title: "Driver reset",
      description: `${driver.name} reset to unassigned`,
    });
  }, [drivers, updateDriverStatus, toast]);

  // Handle driver picker selection (only used for assign and off actions now)
  const handleDriverPickerSelect = useCallback((driver: typeof drivers[0]) => {
    setSelectedDriverId(driver.id);
    setShowDriverPicker(false);
    
    // Execute the pending action
    if (pendingAction) {
      // Small delay to let selection settle
      setTimeout(() => {
        switch (pendingAction) {
          case "assign":
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
    
    // Return drivers who are NOT scheduled for today OR have status "off"
    return drivers.filter(
      (driver) => !scheduledDriverIds.has(driver.id) || driver.status === "off"
    );
  }, [drivers, schedules, isToday]);

  // Check if a driver called out today
  const isCallOut = (driverId: string) => {
    return todayCallOuts.some((co) => co.driver_id === driverId);
  };

  const getCallOutNote = (driverId: string) => {
    const callOut = todayCallOuts.find((co) => co.driver_id === driverId);
    return callOut?.note || null;
  };

  // Calculate stats based on displayed drivers
  const unassignedDrivers = displayDrivers.filter((d) => d.status === "unassigned" || d.status === "scheduled").length;
  const assignedDrivers = displayDrivers.filter((d) => d.status === "assigned").length;
  const workingDrivers = displayDrivers.filter((d) => ["on-route", "working"].includes(d.status)).length;
  const punchedOutDrivers = displayDrivers.filter((d) => ["offline", "punched-out"].includes(d.status)).length;
  const offDriverCount = offDrivers.length;
  const calledOutCount = todayCallOuts.length;

  // Create section-based driver lists for keyboard navigation
  const driverSections = useMemo(() => {
    if (isToday) {
      return {
        assigned: displayDrivers.filter((d) => d.status === "assigned"),
        unassigned: displayDrivers.filter((d) => d.status === "unassigned" || d.status === "scheduled"),
        working: displayDrivers.filter((d) => ["on-route", "working"].includes(d.status)),
        punchedOut: displayDrivers.filter((d) => ["offline", "punched-out"].includes(d.status)),
      };
    } else {
      return {
        unassigned: displayDrivers.filter(d => d.status === "unassigned"),
        assigned: displayDrivers.filter(d => d.status === "assigned"),
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
      // Today: Assigned -> Unassigned -> Working -> Punched Out
      return [
        ...displayDrivers.filter((d) => d.status === "assigned"),
        ...displayDrivers.filter((d) => d.status === "unassigned" || d.status === "scheduled"),
        ...displayDrivers.filter((d) => ["on-route", "working"].includes(d.status)),
        ...displayDrivers.filter((d) => ["offline", "punched-out"].includes(d.status)),
      ];
    } else {
      // Future: Unassigned -> Assigned
      return [
        ...displayDrivers.filter(d => d.status === "unassigned"),
        ...displayDrivers.filter(d => d.status === "assigned"),
      ];
    }
  }, [displayDrivers, isToday]);

  // Auto-select first unassigned driver on page load or when drivers change
  useEffect(() => {
    if (!loading && !schedulesLoading && selectableDrivers.length > 0) {
      // Only auto-select if no driver is currently selected or selected driver no longer exists
      if (!selectedDriverId || !selectableDrivers.find(d => d.id === selectedDriverId)) {
        // Prefer first unassigned driver
        const firstUnassigned = displayDrivers.find((d) => d.status === "unassigned" || d.status === "scheduled");
        if (firstUnassigned) {
          setSelectedDriverId(firstUnassigned.id);
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
    const dialogOpen = showAssignDialog || showOffDialog || showDriverPicker;
    
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
    
    // Arrow keys navigate within current section
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      
      const currentSection = getCurrentSection(selectedDriverId);
      if (!currentSection) return;
      
      const sectionDrivers = driverSections[currentSection] || [];
      if (sectionDrivers.length === 0) return;
      
      const currentIndex = sectionDrivers.findIndex(d => d.id === selectedDriverId);
      let newIndex: number;
      
      if (e.key === "ArrowUp") {
        newIndex = currentIndex <= 0 ? sectionDrivers.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex >= sectionDrivers.length - 1 ? 0 : currentIndex + 1;
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
    
    // === SHORTCUT KEYS (A, P, D, O) ===
    // Only work when not in future date mode (today only)
    if (!isToday) return;
    
    // A → Assign
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!selectedDriverId) {
        setPendingAction("assign");
        setShowDriverPicker(true);
      } else {
        executeAssign(selectedDriverId);
      }
    }
    
    // P → Punch In - always opens dialog, validates on submit
    if (e.key === "p" || e.key === "P") {
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
    executeAssign, 
    executePunchIn, 
    executePunchOut, 
    executeOff
  ]);

  // Handler for driver pill click - select and show details
  const handleDriverSelect = useCallback((driverId: string) => {
    setSelectedDriverId(driverId);
    setShowDetailsPanel(true);
  }, []);

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
          {isToday && selectedDriverId && (() => {
            const selectedDriver = drivers.find(d => d.id === selectedDriverId);
            if (!selectedDriver) return null;
            return (
              <DriverActionToolbar
                driverName={selectedDriver.name}
                status={selectedDriver.status}
                onAssign={() => executeAssign(selectedDriverId)}
                onPunchIn={() => executePunchIn(selectedDriverId)}
                onPunchOut={() => executePunchOut(selectedDriverId)}
                onMarkOff={() => executeOff(selectedDriverId)}
                onUnassign={() => executeUnassign(selectedDriverId)}
                onReset={() => executeReset(selectedDriverId)}
              />
            );
          })()}
        </div>

        {/* Date Selector */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                disabled={weekOffset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span className="text-xs">Calendar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(startOfDay(date));
                      // Adjust week offset to show the selected date's week
                      const daysDiff = Math.floor((startOfDay(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      setWeekOffset(Math.floor(daysDiff / 7));
                    }
                  }}
                  disabled={(date) => startOfDay(date) < today}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Day Buttons */}
          <div className="flex gap-1">
            {weekDays.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isPast = date < today;
              const isCurrentDay = isSameDay(date, today);
              
              return (
                <Button
                  key={date.toISOString()}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 flex flex-col h-auto py-1.5 px-1",
                    isPast && "opacity-50 cursor-not-allowed",
                    isCurrentDay && !isSelected && "border-primary"
                  )}
                  onClick={() => !isPast && setSelectedDate(date)}
                  disabled={isPast}
                >
                  <span className="text-[10px] font-medium">{format(date, "EEE")}</span>
                  <span className="text-sm font-bold">{format(date, "d")}</span>
                </Button>
              );
            })}
          </div>

          {/* Selected Date Info */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {isToday ? "Today" : format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
            {isFutureDate && (
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                Showing {getAvailableDriversWithSchedule?.length || 0} scheduled drivers as unassigned
              </span>
            )}
          </div>
        </section>

        {/* Driver Status */}
        <section className="rounded-xl border border-border bg-card/50 p-6 mb-6 min-h-[500px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Driver Status
            </h2>
            <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
              {displayDrivers.length} TOTAL
            </span>
          </div>
          
          {/* Color Legend */}
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <span>Unassigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-on-route" />
              <span>Working</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-status-offline" />
              <span>Punched Out</span>
            </div>
          </div>

          {isFutureDate ? (
            /* Future Date View - Two Column Layout */
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Scheduled/Unassigned */}
              <div className="space-y-2">
                <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                  <span>Scheduled</span>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                    {displayDrivers.filter(d => d.status === "unassigned").length}
                  </span>
                </h3>
                <div className="flex flex-col gap-1">
                  {displayDrivers
                    .filter(d => d.status === "unassigned")
                    .map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => {
                          handleDriverSelect(driver.id);
                          if (isAdmin) openAssignDialog(driver.id, driver.name);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-sm transition-all duration-200",
                          isAdmin && "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5",
                          selectedDriverId === driver.id && "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                        <span className="font-medium text-foreground flex-1">{driver.name}</span>
                        {(driver as any).has_cdl && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                        )}
                        {driver.schedule && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>
                              {driver.schedule.start_time?.slice(0, 5) || "--:--"}
                              {" - "}
                              {driver.schedule.end_time?.slice(0, 5) || "--:--"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  {displayDrivers.filter(d => d.status === "unassigned").length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers scheduled for this day</p>
                  )}
                </div>
              </div>

              {/* Right Column - Assigned */}
              <div className="space-y-2">
                <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                  <span>Assigned</span>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                    {displayDrivers.filter(d => d.status === "assigned").length}
                  </span>
                </h3>
                <div className="flex flex-col gap-1">
                  {displayDrivers
                    .filter(d => d.status === "assigned")
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
                        {driver.report_time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{driver.report_time.slice(0, 5)}</span>
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
                  {displayDrivers.filter(d => d.status === "assigned").length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers assigned yet</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Today View - Full Status Grid */
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="flex flex-col gap-5">
                {/* Assigned */}
                <div className="space-y-2">
                  <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                    <span>Assigned</span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {assignedDrivers}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayDrivers
                      .filter((d) => d.status === "assigned")
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                          availableVehicles={vehicles}
                          mini
                          isSelected={selectedDriverId === driver.id}
                          onSelect={handleDriverSelect}
                        />
                      ))}
                    {assignedDrivers === 0 && (
                      <p className="text-sm text-muted-foreground italic py-3">No assigned drivers</p>
                    )}
                  </div>
                </div>

                {/* Unassigned */}
                <div className="space-y-2">
                  <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                    <span>Unassigned</span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {unassignedDrivers}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayDrivers
                      .filter((d) => d.status === "unassigned" || d.status === "scheduled")
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                          availableVehicles={vehicles}
                          mini
                          isSelected={selectedDriverId === driver.id}
                          onSelect={handleDriverSelect}
                        />
                      ))}
                    {unassignedDrivers === 0 && (
                      <p className="text-sm text-muted-foreground italic py-3">No unassigned drivers</p>
                    )}
                  </div>
                </div>

                {/* OFF Drivers - Collapsible */}
                <Collapsible open={offDriversOpen} onOpenChange={setOffDriversOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2 hover:text-foreground transition-colors cursor-pointer">
                    <span className="flex items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", !offDriversOpen && "-rotate-90")} />
                      OFF Drivers
                      {calledOutCount > 0 && (
                        <span className="rounded bg-destructive/20 text-destructive px-1.5 py-0.5 font-mono text-xs">
                          {calledOutCount} called out
                        </span>
                      )}
                    </span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {offDriverCount}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="flex flex-col gap-2">
                      {offDrivers.map((driver) => {
                        const calledOut = isCallOut(driver.id);
                        const note = getCallOutNote(driver.id);
                        return (
                          <div
                            key={driver.id}
                            className={cn(
                              "flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-sm",
                              calledOut && "border-l-2 border-l-destructive bg-destructive/5"
                            )}
                          >
                            <span className="h-2.5 w-2.5 rounded-full bg-status-offline shrink-0" />
                            <span className="font-mono font-medium text-foreground flex-1">{driver.name}</span>
                            {(driver as any).has_cdl && (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
                            )}
                            {calledOut && (
                              <span className="flex items-center gap-1.5 text-destructive" title={note || "Called out"}>
                                <PhoneOff className="h-4 w-4" />
                                <span className="text-xs">Called Out</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {offDriverCount === 0 && (
                        <p className="text-sm text-muted-foreground italic py-3">No OFF drivers</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-5">
                {/* Working */}
                <div className="space-y-2">
                  <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                    <span>Working</span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {workingDrivers}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayDrivers
                      .filter((d) => ["on-route", "working"].includes(d.status))
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                          availableVehicles={vehicles}
                          mini
                          isSelected={selectedDriverId === driver.id}
                          onSelect={handleDriverSelect}
                        />
                      ))}
                    {workingDrivers === 0 && (
                      <p className="text-sm text-muted-foreground italic py-3">No drivers working</p>
                    )}
                  </div>
                </div>

                {/* Punched Out */}
                <div className="space-y-2">
                  <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                    <span>Punched Out</span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
                      {punchedOutDrivers}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {displayDrivers
                      .filter((d) => ["offline", "punched-out"].includes(d.status))
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                          availableVehicles={vehicles}
                          mini
                          isSelected={selectedDriverId === driver.id}
                          onSelect={handleDriverSelect}
                        />
                      ))}
                    {punchedOutDrivers === 0 && (
                      <p className="text-sm text-muted-foreground italic py-3">No drivers punched out</p>
                    )}
                  </div>
                </div>
              </div>
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
                <SelectTrigger id="assign-driver">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.is_active && ["unassigned", "scheduled", "assigned"].includes(d.status))
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="future-report-time">Report Time (optional)</Label>
              <TimeInput
                id="future-report-time"
                value={assignReportTime}
                onChange={setAssignReportTime}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    assignButtonRef.current?.focus();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="future-vehicle">Vehicle (optional)</Label>
              <Select 
                value={assignVehicle} 
                onValueChange={(val) => {
                  setAssignVehicle(val);
                  setTimeout(() => assignButtonRef.current?.focus(), 0);
                }}
              >
                <SelectTrigger 
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey) {
                      e.preventDefault();
                      assignButtonRef.current?.focus();
                    }
                  }}
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
                    .filter((d) => d.is_active && d.status !== "off" && !["working", "on-route"].includes(d.status))
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={() => setShowOffDialog(false)} tabIndex={-1}>
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
          if (!open) setPunchInDriver(null);
        }}
      >
        <DialogContent 
          className="sm:max-w-[350px]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => punchInSelectRef.current?.focus(), 0);
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
                    setPunchInVehicle(getDriverDefaultVehicle(driver.id));
                  }
                }}
              >
                <SelectTrigger id="punch-in-driver" ref={punchInSelectRef}>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.is_active)
                    .map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                        {driver.status !== "assigned" && (
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
              <Label htmlFor="punch-in-vehicle">Vehicle</Label>
              <Select 
                value={punchInVehicle} 
                onValueChange={setPunchInVehicle}
              >
                <SelectTrigger id="punch-in-vehicle">
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
                value={punchInTime}
                onChange={setPunchInTime}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchInDialog(false)} tabIndex={-1}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPunchIn} disabled={!punchInDriver}>
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
          if (!open) setPunchOutDriver(null);
        }}
      >
        <DialogContent 
          className="sm:max-w-[350px]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => punchOutSelectRef.current?.focus(), 0);
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
                  }
                }}
              >
                <SelectTrigger id="punch-out-driver" ref={punchOutSelectRef}>
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
            <div className="grid gap-2">
              <Label htmlFor="punch-out-time">Time</Label>
              <TimeInput
                id="punch-out-time"
                value={punchOutTime}
                onChange={setPunchOutTime}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPunchOutDialog(false)} tabIndex={-1}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPunchOut} disabled={!punchOutDriver}>
              Punch Out
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
          pendingAction === "assign" ? "Select Driver to Assign" :
          pendingAction === "off" ? "Select Driver to Mark OFF" :
          "Select Driver"
        }
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
