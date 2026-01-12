import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Clock, Download, ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Calendar, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 40 hours = 2400 minutes
const OVERTIME_THRESHOLD_MINUTES = 40 * 60;

interface Shift {
  id: string;
  driver_id: string;
  driver_name: string;
  punch_in_at: string;
  punch_out_at: string | null;
  workday_date: string;
  vehicle_unit: string | null;
  notes: string | null;
  created_at: string;
}

// Virtual punch record for display purposes
interface VirtualPunch {
  id: string; // shift_id + _in or _out
  shift_id: string;
  driver_id: string;
  driver_name: string;
  punch_type: "in" | "out";
  punch_time: string;
  notes: string | null;
  vehicle_unit: string | null;
}

interface Driver {
  id: string;
  name: string;
}

interface DriverHours {
  driverId: string;
  driverName: string;
  totalMinutes: number;
  sessions: { inTime: Date; outTime: Date | null }[];
}

export function TimePunchReport() {
  const { formatDate, dateFormat } = useDateFormat();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.toISOString().split("T")[0];
  });

  // Weekly view state
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyShifts, setWeeklyShifts] = useState<Shift[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  // Get current week dates (Monday-Sunday)
  const currentWeekStart = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }); // Monday
    return start;
  }, [weekOffset]);

  const currentWeekEnd = useMemo(() => {
    return endOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Sunday
  }, [currentWeekStart]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  }, [currentWeekStart, currentWeekEnd]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editPunchInDate, setEditPunchInDate] = useState("");
  const [editPunchInTime, setEditPunchInTime] = useState("");
  const [editPunchOutDate, setEditPunchOutDate] = useState("");
  const [editPunchOutTime, setEditPunchOutTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDriverId, setAddDriverId] = useState("");
  const [addPunchInDate, setAddPunchInDate] = useState("");
  const [addPunchInTime, setAddPunchInTime] = useState("");
  const [addPunchOutDate, setAddPunchOutDate] = useState("");
  const [addPunchOutTime, setAddPunchOutTime] = useState("");
  const [addNotes, setAddNotes] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  // Payroll filter state
  const [payrollDriverFilter, setPayrollDriverFilter] = useState("");

  // Convert shifts to virtual punches for display
  const punches = useMemo((): VirtualPunch[] => {
    const result: VirtualPunch[] = [];
    shifts.forEach((shift) => {
      // Add punch in
      result.push({
        id: `${shift.id}_in`,
        shift_id: shift.id,
        driver_id: shift.driver_id,
        driver_name: shift.driver_name,
        punch_type: "in",
        punch_time: shift.punch_in_at,
        notes: shift.notes,
        vehicle_unit: shift.vehicle_unit,
      });
      // Add punch out if exists
      if (shift.punch_out_at) {
        result.push({
          id: `${shift.id}_out`,
          shift_id: shift.id,
          driver_id: shift.driver_id,
          driver_name: shift.driver_name,
          punch_type: "out",
          punch_time: shift.punch_out_at,
          notes: shift.notes,
          vehicle_unit: shift.vehicle_unit,
        });
      }
    });
    // Sort by punch time descending
    return result.sort((a, b) => new Date(b.punch_time).getTime() - new Date(a.punch_time).getTime());
  }, [shifts]);

  const fetchShifts = async () => {
    setLoading(true);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .gte("punch_in_at", startDateTime.toISOString())
      .lte("punch_in_at", endDateTime.toISOString())
      .order("punch_in_at", { ascending: false });

    if (error) {
      console.error("Error fetching shifts:", error);
    } else {
      setShifts(data || []);
    }
    setLoading(false);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("id, name").order("name");
    if (data) setDrivers(data);
  };

  // Fetch weekly shifts
  const fetchWeeklyShifts = async () => {
    setWeeklyLoading(true);
    const startDateTime = new Date(currentWeekStart);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(currentWeekEnd);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .gte("punch_in_at", startDateTime.toISOString())
      .lte("punch_in_at", endDateTime.toISOString())
      .order("punch_in_at", { ascending: true });

    if (!error && data) {
      setWeeklyShifts(data || []);
    }
    setWeeklyLoading(false);
  };

  useEffect(() => {
    fetchShifts();
    fetchDrivers();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchWeeklyShifts();
  }, [currentWeekStart]);

  // Calculate weekly hours per driver per day from shifts
  const weeklyDriverHours = useMemo(() => {
    const driverMap = new Map<string, { name: string; dayHours: Map<string, number> }>();
    
    weeklyShifts.forEach((shift) => {
      if (!driverMap.has(shift.driver_id)) {
        driverMap.set(shift.driver_id, { name: shift.driver_name, dayHours: new Map() });
      }
      
      const driverData = driverMap.get(shift.driver_id)!;
      
      if (shift.punch_out_at) {
        const inTime = new Date(shift.punch_in_at);
        const outTime = new Date(shift.punch_out_at);
        const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
        
        // Use the workday_date or the punch_out date
        const dateStr = shift.workday_date || format(outTime, "yyyy-MM-dd");
        const currentMinutes = driverData.dayHours.get(dateStr) || 0;
        driverData.dayHours.set(dateStr, currentMinutes + minutes);
      }
    });

    // Convert to array format
    const result: { driverId: string; driverName: string; dailyHours: { [key: string]: number }; weekTotal: number }[] = [];
    
    driverMap.forEach((data, driverId) => {
      const dailyHours: { [key: string]: number } = {};
      let weekTotal = 0;
      
      data.dayHours.forEach((minutes, dateStr) => {
        dailyHours[dateStr] = minutes;
        weekTotal += minutes;
      });
      
      result.push({
        driverId,
        driverName: data.name,
        dailyHours,
        weekTotal,
      });
    });

    // Sort by week total descending
    return result.sort((a, b) => b.weekTotal - a.weekTotal);
  }, [weeklyShifts]);

  // Build payroll data with detailed punch in/out times per day per driver
  const buildPayrollData = (filterName: string = "") => {
    interface DailyRecord {
      date: string;
      punchIn: string | null;
      punchOut: string | null;
      dailyTotalMinutes: number;
      dailyTotal: string;
    }
    
    interface DriverPayroll {
      driverId: string;
      driverName: string;
      dailyRecords: DailyRecord[];
      weekTotalMinutes: number;
      weeklyTotal: string;
      overtime: string;
    }

    // Group shifts by driver
    const driverShifts = new Map<string, { name: string; shifts: Shift[] }>();
    weeklyShifts.forEach((shift) => {
      if (!driverShifts.has(shift.driver_id)) {
        driverShifts.set(shift.driver_id, { name: shift.driver_name, shifts: [] });
      }
      driverShifts.get(shift.driver_id)!.shifts.push(shift);
    });

    const result: DriverPayroll[] = [];

    driverShifts.forEach((data, driverId) => {
      // Sort shifts by punch_in_at
      const sortedShifts = [...data.shifts].sort(
        (a, b) => new Date(a.punch_in_at).getTime() - new Date(b.punch_in_at).getTime()
      );

      // Group by date
      const dateGroups = new Map<string, { ins: Date[]; outs: (Date | null)[] }>();
      
      sortedShifts.forEach((shift) => {
        const inTime = new Date(shift.punch_in_at);
        const dateStr = format(inTime, "MM/dd/yyyy");
        if (!dateGroups.has(dateStr)) {
          dateGroups.set(dateStr, { ins: [], outs: [] });
        }
        dateGroups.get(dateStr)!.ins.push(inTime);
        dateGroups.get(dateStr)!.outs.push(shift.punch_out_at ? new Date(shift.punch_out_at) : null);
      });

      const dailyRecords: DailyRecord[] = [];
      let weekTotalMinutes = 0;

      // Process each day in the week that has shifts
      weekDays.forEach((day) => {
        const dateStr = format(day, "MM/dd/yyyy");
        const group = dateGroups.get(dateStr);
        
        if (group && group.ins.length > 0) {
          let dailyMinutes = 0;
          
          for (let i = 0; i < group.ins.length; i++) {
            const punchIn = group.ins[i];
            const punchOut = group.outs[i];
            
            if (punchIn && punchOut) {
              dailyMinutes += (punchOut.getTime() - punchIn.getTime()) / (1000 * 60);
            }
            
            dailyRecords.push({
              date: i === 0 ? dateStr : "",
              punchIn: punchIn ? format(punchIn, "h:mm a") : null,
              punchOut: punchOut ? format(punchOut, "h:mm a") : null,
              dailyTotalMinutes: i === group.ins.length - 1 ? dailyMinutes : 0,
              dailyTotal: i === group.ins.length - 1 ? formatHoursMinutes(dailyMinutes) : "",
            });
          }
          
          weekTotalMinutes += dailyMinutes;
        }
      });

      if (dailyRecords.length > 0) {
        const overtimeMinutes = Math.max(0, weekTotalMinutes - OVERTIME_THRESHOLD_MINUTES);
        result.push({
          driverId,
          driverName: data.name,
          dailyRecords,
          weekTotalMinutes,
          weeklyTotal: formatHoursMinutes(weekTotalMinutes),
          overtime: overtimeMinutes > 0 ? formatHoursMinutes(overtimeMinutes) : "",
        });
      }
    });

    // Filter by name and sort
    const filtered = filterName.trim()
      ? result.filter(d => d.driverName.toLowerCase().includes(filterName.toLowerCase().trim()))
      : result;
    return filtered.sort((a, b) => a.driverName.localeCompare(b.driverName));
  };

  // Calculate total hours per driver
  const driverHours: DriverHours[] = useMemo(() => {
    const driverMap = new Map<string, { name: string; shifts: Shift[] }>();
    
    // Group shifts by driver
    shifts.forEach((shift) => {
      if (!driverMap.has(shift.driver_id)) {
        driverMap.set(shift.driver_id, { name: shift.driver_name, shifts: [] });
      }
      driverMap.get(shift.driver_id)!.shifts.push(shift);
    });

    const results: DriverHours[] = [];

    driverMap.forEach((data, driverId) => {
      let totalMinutes = 0;
      const sessions: { inTime: Date; outTime: Date | null }[] = [];

      data.shifts.forEach((shift) => {
        const inTime = new Date(shift.punch_in_at);
        const outTime = shift.punch_out_at ? new Date(shift.punch_out_at) : null;
        
        if (outTime) {
          const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
          totalMinutes += minutes;
        }
        
        sessions.push({ inTime, outTime });
      });

      results.push({
        driverId,
        driverName: data.name,
        totalMinutes,
        sessions,
      });
    });

    return results.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [shifts]);

  // Calculate daily breakdown
  const dailyBreakdown = useMemo(() => {
    const dayMap = new Map<string, Map<string, { name: string; minutes: number; hasOpenSession: boolean }>>();
    
    shifts.forEach((shift) => {
      const punchDate = format(new Date(shift.punch_in_at), "yyyy-MM-dd");
      
      if (!dayMap.has(punchDate)) {
        dayMap.set(punchDate, new Map());
      }
      const dayDrivers = dayMap.get(punchDate)!;
      
      if (!dayDrivers.has(shift.driver_id)) {
        dayDrivers.set(shift.driver_id, { name: shift.driver_name, minutes: 0, hasOpenSession: false });
      }
      
      const driverData = dayDrivers.get(shift.driver_id)!;
      
      if (shift.punch_out_at) {
        const inTime = new Date(shift.punch_in_at);
        const outTime = new Date(shift.punch_out_at);
        const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
        driverData.minutes += minutes;
      } else {
        driverData.hasOpenSession = true;
      }
    });

    // Convert to array and sort by date descending
    const result: { date: string; drivers: { id: string; name: string; minutes: number; hasOpenSession: boolean }[] }[] = [];
    
    dayMap.forEach((drivers, date) => {
      const driverArray: { id: string; name: string; minutes: number; hasOpenSession: boolean }[] = [];
      drivers.forEach((data, id) => {
        driverArray.push({ id, ...data });
      });
      driverArray.sort((a, b) => b.minutes - a.minutes);
      result.push({ date, drivers: driverArray });
    });

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts]);

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    const headers = ["Driver Name", "Punch Type", "Punch Time", "Vehicle", "Notes"];
    const rows = punches.map((p) => [
      p.driver_name,
      p.punch_type === "in" ? "Punch In" : "Punch Out",
      format(new Date(p.punch_time), "yyyy-MM-dd HH:mm:ss"),
      p.vehicle_unit || "",
      p.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-punches-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportWeeklyToCSV = () => {
    const headers = ["Driver", ...weekDays.map(d => format(d, "EEE MM/dd")), "Total"];
    const rows = weeklyDriverHours.map((driver) => {
      const dailyCells = weekDays.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const minutes = driver.dailyHours[dateStr] || 0;
        return minutes > 0 ? formatHoursMinutes(minutes) : "";
      });
      return [driver.driverName, ...dailyCells, formatHoursMinutes(driver.weekTotal)];
    });

    // Add total row
    const totalRow = ["Total", ...weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayTotal = weeklyDriverHours.reduce((sum, d) => sum + (d.dailyHours[dateStr] || 0), 0);
      return dayTotal > 0 ? formatHoursMinutes(dayTotal) : "";
    }), formatHoursMinutes(weeklyDriverHours.reduce((sum, d) => sum + d.weekTotal, 0))];
    rows.push(totalRow);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-hours-${format(currentWeekStart, "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportWeeklyToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow popups to export PDF", variant: "destructive" });
      return;
    }

    const totalHours = weeklyDriverHours.reduce((sum, d) => sum + d.weekTotal, 0);

    const tableRows = weeklyDriverHours.map((driver) => {
      const dailyCells = weekDays.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const minutes = driver.dailyHours[dateStr] || 0;
        return `<td style="text-align:center;padding:8px;border:1px solid #ddd;">${minutes > 0 ? formatHoursMinutes(minutes) : "-"}</td>`;
      }).join("");
      return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:500;">${driver.driverName}</td>${dailyCells}<td style="text-align:center;padding:8px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">${formatHoursMinutes(driver.weekTotal)}</td></tr>`;
    }).join("");

    const totalRowCells = weekDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayTotal = weeklyDriverHours.reduce((sum, d) => sum + (d.dailyHours[dateStr] || 0), 0);
      return `<td style="text-align:center;padding:8px;border:1px solid #ddd;font-weight:bold;">${dayTotal > 0 ? formatHoursMinutes(dayTotal) : "-"}</td>`;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weekly Time Report - ${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f0f0f0; padding: 8px; border: 1px solid #ddd; text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>Weekly Time Punch Report</h1>
        <h2>${format(currentWeekStart, "MMMM d")} - ${format(currentWeekEnd, "MMMM d, yyyy")}</h2>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Driver</th>
              ${weekDays.map(d => `<th>${format(d, "EEE")}<br/>${format(d, "M/d")}</th>`).join("")}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="background:#e8e8e8;font-weight:bold;">
              <td style="padding:8px;border:1px solid #ddd;">Total</td>
              ${totalRowCells}
              <td style="text-align:center;padding:8px;border:1px solid #ddd;">${formatHoursMinutes(totalHours)}</td>
            </tr>
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    const punchInDate = new Date(shift.punch_in_at);
    setEditPunchInDate(format(punchInDate, "yyyy-MM-dd"));
    setEditPunchInTime(format(punchInDate, "HH:mm"));
    
    if (shift.punch_out_at) {
      const punchOutDate = new Date(shift.punch_out_at);
      setEditPunchOutDate(format(punchOutDate, "yyyy-MM-dd"));
      setEditPunchOutTime(format(punchOutDate, "HH:mm"));
    } else {
      setEditPunchOutDate("");
      setEditPunchOutTime("");
    }
    setEditNotes(shift.notes || "");
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingShift) return;

    const newPunchInAt = new Date(`${editPunchInDate}T${editPunchInTime}`);
    const newPunchOutAt = editPunchOutDate && editPunchOutTime 
      ? new Date(`${editPunchOutDate}T${editPunchOutTime}`)
      : null;
    
    const { error } = await supabase
      .from("shifts")
      .update({
        punch_in_at: newPunchInAt.toISOString(),
        punch_out_at: newPunchOutAt?.toISOString() || null,
        notes: editNotes || null,
      })
      .eq("id", editingShift.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update shift record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Shift record updated" });
      setEditDialogOpen(false);
      fetchShifts();
      fetchWeeklyShifts();
    }
  };

  const openAddDialog = () => {
    const now = new Date();
    setAddDriverId("");
    setAddPunchInDate(format(now, "yyyy-MM-dd"));
    setAddPunchInTime(format(now, "HH:mm"));
    setAddPunchOutDate("");
    setAddPunchOutTime("");
    setAddNotes("");
    setAddDialogOpen(true);
  };

  const handleAddSave = async () => {
    if (!addDriverId) {
      toast({ title: "Error", description: "Please select a driver", variant: "destructive" });
      return;
    }

    const driver = drivers.find((d) => d.id === addDriverId);
    if (!driver) return;

    const punchInAt = new Date(`${addPunchInDate}T${addPunchInTime}`);
    const punchOutAt = addPunchOutDate && addPunchOutTime 
      ? new Date(`${addPunchOutDate}T${addPunchOutTime}`)
      : null;
    
    const { error } = await supabase.from("shifts").insert({
      driver_id: addDriverId,
      driver_name: driver.name,
      punch_in_at: punchInAt.toISOString(),
      punch_out_at: punchOutAt?.toISOString() || null,
      workday_date: format(punchInAt, "yyyy-MM-dd"),
      notes: addNotes || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add shift record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Shift record added" });
      setAddDialogOpen(false);
      fetchShifts();
      fetchWeeklyShifts();
    }
  };

  const openDeleteDialog = (shift: Shift) => {
    setDeletingShift(shift);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingShift) return;

    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", deletingShift.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete shift record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Shift record deleted" });
      setDeleteDialogOpen(false);
      fetchShifts();
      fetchWeeklyShifts();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Time Clock
        </h3>
        <div className="flex gap-2">
          <Button onClick={openAddDialog} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={punches.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="payroll">Payroll Report</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
          <TabsTrigger value="daterange">Date Range</TabsTrigger>
        </TabsList>

        {/* Payroll Report Tab */}
        <TabsContent value="payroll" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
              </span>
              {weekOffset === 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Current Week</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export payroll to CSV
                  const headers = ["Driver", "Date", "Punch In", "Punch Out", "Daily Total", "Weekly Total", "Overtime"];
                  const rows: string[][] = [];
                  
                  // Build payroll data for export
                  const payrollData = buildPayrollData(payrollDriverFilter);
                  payrollData.forEach((driver) => {
                    driver.dailyRecords.forEach((record, idx) => {
                      rows.push([
                        idx === 0 ? driver.driverName : "",
                        record.date,
                        record.punchIn || "-",
                        record.punchOut || "-",
                        record.dailyTotal,
                        idx === 0 ? driver.weeklyTotal : "",
                        idx === 0 ? driver.overtime : "",
                      ]);
                    });
                    // Add empty row between drivers
                    rows.push(["", "", "", "", "", "", ""]);
                  });
                  
                  const csvContent = [
                    headers.join(","),
                    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
                  ].join("\n");

                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `payroll-report-${format(currentWeekStart, "yyyy-MM-dd")}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={weeklyDriverHours.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) {
                    toast({ title: "Error", description: "Please allow popups to export PDF", variant: "destructive" });
                    return;
                  }

                  const payrollData = buildPayrollData(payrollDriverFilter);
                  const totalWeekHours = payrollData.reduce((sum, d) => sum + d.weekTotalMinutes, 0);
                  const totalOvertimeHours = payrollData.reduce((sum, d) => sum + Math.max(0, d.weekTotalMinutes - OVERTIME_THRESHOLD_MINUTES), 0);

                  const tableRows = payrollData.map((driver) => {
                    const isOvertime = driver.weekTotalMinutes > OVERTIME_THRESHOLD_MINUTES;
                    return driver.dailyRecords.map((record, idx) => `
                      <tr style="${isOvertime ? 'background:#fff8e6;' : ''}${idx === driver.dailyRecords.length - 1 ? 'border-bottom:2px solid #ccc;' : ''}">
                        <td style="padding:6px 10px;border:1px solid #ddd;font-weight:${idx === 0 ? '600' : '400'};">
                          ${idx === 0 ? driver.driverName + (isOvertime ? ' <span style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;">OT</span>' : '') : ''}
                        </td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;">${record.date}</td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;color:#16a34a;">${record.punchIn || '-'}</td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;color:#dc2626;">${record.punchOut || (record.punchIn ? '<span style="color:#d97706;font-size:11px;">Open</span>' : '-')}</td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;font-weight:500;">${record.dailyTotal !== "0h 0m" ? record.dailyTotal : '-'}</td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;font-weight:700;${isOvertime ? 'color:#b45309;' : ''}">${idx === 0 ? driver.weeklyTotal : ''}</td>
                        <td style="text-align:center;padding:6px 10px;border:1px solid #ddd;font-family:monospace;font-weight:700;${isOvertime ? 'background:#fef3c7;color:#b45309;' : ''}">${idx === 0 ? (driver.overtime || '-') : ''}</td>
                      </tr>
                    `).join("");
                  }).join("");

                  const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Payroll Report - ${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
                        h1 { font-size: 20px; margin-bottom: 5px; }
                        h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
                        .summary { display: flex; gap: 30px; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                        .summary-item { text-align: center; }
                        .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
                        .summary-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th { background: #f0f0f0; padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: 600; }
                        th:first-child { text-align: left; }
                        @media print { 
                          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                          .summary { break-inside: avoid; }
                        }
                      </style>
                    </head>
                    <body>
                      <h1>Payroll Report</h1>
                      <h2>${format(currentWeekStart, "MMMM d")} - ${format(currentWeekEnd, "MMMM d, yyyy")} (Monday - Sunday)</h2>
                      
                      <div class="summary">
                        <div class="summary-item">
                          <div class="summary-label">Total Drivers</div>
                          <div class="summary-value">${payrollData.length}</div>
                        </div>
                        <div class="summary-item">
                          <div class="summary-label">Total Hours</div>
                          <div class="summary-value">${formatHoursMinutes(totalWeekHours)}</div>
                        </div>
                        <div class="summary-item">
                          <div class="summary-label">Total Overtime</div>
                          <div class="summary-value" style="color:#b45309;">${totalOvertimeHours > 0 ? formatHoursMinutes(totalOvertimeHours) : '-'}</div>
                        </div>
                        <div class="summary-item">
                          <div class="summary-label">Drivers with OT</div>
                          <div class="summary-value" style="color:#b45309;">${payrollData.filter(d => d.weekTotalMinutes > OVERTIME_THRESHOLD_MINUTES).length}</div>
                        </div>
                      </div>

                      <table>
                        <thead>
                          <tr>
                            <th style="text-align:left;min-width:140px;">Driver</th>
                            <th style="min-width:90px;">Date</th>
                            <th style="min-width:80px;">Punch In</th>
                            <th style="min-width:80px;">Punch Out</th>
                            <th style="min-width:90px;">Daily Total</th>
                            <th style="min-width:90px;">Weekly Total</th>
                            <th style="min-width:80px;">Overtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                      <script>window.onload = function() { window.print(); }</script>
                    </body>
                    </html>
                  `;

                  printWindow.document.write(html);
                  printWindow.document.close();
                }}
                disabled={weeklyDriverHours.length === 0}
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Driver Filter */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by driver name..."
              value={payrollDriverFilter}
              onChange={(e) => setPayrollDriverFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {weeklyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : weeklyDriverHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shifts found for this week.
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payroll Report (Mon-Sun)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Driver</TableHead>
                        <TableHead className="text-center min-w-[100px]">Date</TableHead>
                        <TableHead className="text-center min-w-[90px]">Punch In</TableHead>
                        <TableHead className="text-center min-w-[90px]">Punch Out</TableHead>
                        <TableHead className="text-center min-w-[100px]">Daily Total</TableHead>
                        <TableHead className="text-center min-w-[100px] font-bold">Weekly Total</TableHead>
                        <TableHead className="text-center min-w-[90px] font-bold">Overtime</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const payrollData = buildPayrollData(payrollDriverFilter);
                        return payrollData.map((driver) => {
                          const isOvertime = driver.weekTotalMinutes > OVERTIME_THRESHOLD_MINUTES;
                          return driver.dailyRecords.map((record, recordIdx) => (
                            <TableRow 
                              key={`${driver.driverId}-${record.date}-${recordIdx}`}
                              className={`${isOvertime ? "bg-amber-500/10" : ""} ${recordIdx === driver.dailyRecords.length - 1 ? "border-b-2 border-border" : ""}`}
                            >
                              <TableCell className={`font-medium ${recordIdx === 0 ? "" : "text-muted-foreground/0"}`}>
                                {recordIdx === 0 && (
                                  <div className="flex items-center gap-2">
                                    {driver.driverName}
                                    {isOvertime && (
                                      <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs">
                                        OT
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {record.date}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {record.punchIn ? (
                                  <span className="text-green-600">{record.punchIn}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {record.punchOut ? (
                                  <span className="text-red-600">{record.punchOut}</span>
                                ) : record.punchIn ? (
                                  <span className="text-amber-600 text-xs">Open</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm font-medium">
                                {record.dailyTotal !== "0h 0m" ? record.dailyTotal : "-"}
                              </TableCell>
                              <TableCell className={`text-center font-mono font-bold ${isOvertime ? "text-amber-700" : ""}`}>
                                {recordIdx === 0 ? driver.weeklyTotal : ""}
                              </TableCell>
                              <TableCell className={`text-center font-mono font-bold ${isOvertime ? "text-amber-700 bg-amber-500/20" : ""}`}>
                                {recordIdx === 0 ? (isOvertime ? driver.overtime : "-") : ""}
                              </TableCell>
                            </TableRow>
                          ));
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Weekly Summary Tab */}
        <TabsContent value="weekly" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekOffset((prev) => prev - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(currentWeekStart, "MMM d")} - {format(currentWeekEnd, "MMM d, yyyy")}
              </span>
              {weekOffset === 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Current Week</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportWeeklyToCSV}
                disabled={weeklyDriverHours.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportWeeklyToPDF}
                disabled={weeklyDriverHours.length === 0}
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {weeklyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : weeklyDriverHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shifts found for this week.
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Hours (Mon-Sun)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background min-w-[120px]">Driver</TableHead>
                        {weekDays.map((day) => (
                          <TableHead key={day.toISOString()} className="text-center min-w-[80px]">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                              <span>{format(day, "d")}</span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[90px] font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyDriverHours.map((driver) => {
                        const isOvertime = driver.weekTotal > OVERTIME_THRESHOLD_MINUTES;
                        return (
                        <TableRow 
                          key={driver.driverId}
                          className={isOvertime ? "bg-amber-500/10" : ""}
                        >
                          <TableCell className={`sticky left-0 font-mono font-medium ${isOvertime ? "bg-amber-500/10" : "bg-background"}`}>
                            <div className="flex items-center gap-2">
                              {driver.driverName}
                              {isOvertime && (
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs">
                                  OT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {weekDays.map((day) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const minutes = driver.dailyHours[dateStr] || 0;
                            return (
                              <TableCell key={dateStr} className="text-center">
                                {minutes > 0 ? (
                                  <span className="font-mono text-sm">
                                    {formatHoursMinutes(minutes)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`text-center font-bold font-mono ${isOvertime ? "bg-amber-500/20 text-amber-700" : "bg-muted/30"}`}>
                            {formatHoursMinutes(driver.weekTotal)}
                            {isOvertime && (
                              <span className="block text-xs text-amber-600">
                                +{formatHoursMinutes(driver.weekTotal - OVERTIME_THRESHOLD_MINUTES)} OT
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="sticky left-0 bg-muted/50">Total</TableCell>
                        {weekDays.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const dayTotal = weeklyDriverHours.reduce(
                            (sum, d) => sum + (d.dailyHours[dateStr] || 0), 0
                          );
                          return (
                            <TableCell key={dateStr} className="text-center font-mono">
                              {dayTotal > 0 ? formatHoursMinutes(dayTotal) : "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-mono bg-primary/10">
                          {formatHoursMinutes(weeklyDriverHours.reduce((sum, d) => sum + d.weekTotal, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Date Range Tab */}
        <TabsContent value="daterange" className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchShifts} variant="secondary">
              Refresh
            </Button>
          </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No shifts found for the selected date range.
        </div>
      ) : (
        <>
          {/* Hours Summary */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hours Worked - Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {driverHours.map((driver) => (
                  <div
                    key={driver.driverId}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <span className="font-mono text-sm truncate mr-2">{driver.driverName}</span>
                    <span className="font-semibold text-sm whitespace-nowrap">
                      {formatHoursMinutes(driver.totalMinutes)}
                      {driver.sessions.some((s) => !s.outTime) && (
                        <span className="ml-1 text-xs text-amber-500" title="Currently clocked in">●</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total (all drivers)</span>
                <span className="font-bold">
                  {formatHoursMinutes(driverHours.reduce((sum, d) => sum + d.totalMinutes, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyBreakdown.map((day) => (
                <div key={day.date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {format(new Date(day.date + "T12:00:00"), "EEEE, MMM d, yyyy")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatHoursMinutes(day.drivers.reduce((sum, d) => sum + d.minutes, 0))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {day.drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
                      >
                        <span className="font-mono truncate mr-2">{driver.name}</span>
                        <span className="font-medium whitespace-nowrap">
                          {formatHoursMinutes(driver.minutes)}
                          {driver.hasOpenSession && (
                            <span className="ml-1 text-xs text-amber-500" title="Currently clocked in">●</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shifts Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => {
                const inTime = new Date(shift.punch_in_at);
                const outTime = shift.punch_out_at ? new Date(shift.punch_out_at) : null;
                const duration = outTime 
                  ? formatHoursMinutes((outTime.getTime() - inTime.getTime()) / (1000 * 60))
                  : null;
                
                return (
                <TableRow key={shift.id}>
                  <TableCell className="font-mono font-medium">
                    {shift.driver_name}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600">
                      <ArrowUpCircle className="h-3 w-3" />
                      {format(inTime, "MMM d, h:mm a")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {outTime ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-600">
                        <ArrowDownCircle className="h-3 w-3" />
                        {format(outTime, "MMM d, h:mm a")}
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs">Open shift</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {duration || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {shift.vehicle_unit || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(shift)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(shift)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <div className="text-xs text-muted-foreground">
        Total shifts: {shifts.length}
      </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift Record</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Driver</Label>
              <Input value={editingShift?.driver_name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Punch In</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-in-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="edit-in-date"
                    type="date"
                    value={editPunchInDate}
                    onChange={(e) => setEditPunchInDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-in-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="edit-in-time"
                    type="time"
                    value={editPunchInTime}
                    onChange={(e) => setEditPunchInTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Punch Out</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-out-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="edit-out-date"
                    type="date"
                    value={editPunchOutDate}
                    onChange={(e) => setEditPunchOutDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-out-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="edit-out-time"
                    type="time"
                    value={editPunchOutTime}
                    onChange={(e) => setEditPunchOutTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Shift</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-driver">Driver</Label>
              <Select value={addDriverId} onValueChange={setAddDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Punch In</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="add-in-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="add-in-date"
                    type="date"
                    value={addPunchInDate}
                    onChange={(e) => setAddPunchInDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-in-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="add-in-time"
                    type="time"
                    value={addPunchInTime}
                    onChange={(e) => setAddPunchInTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Punch Out (optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="add-out-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="add-out-date"
                    type="date"
                    value={addPunchOutDate}
                    onChange={(e) => setAddPunchOutDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-out-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="add-out-time"
                    type="time"
                    value={addPunchOutTime}
                    onChange={(e) => setAddPunchOutTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea
                id="add-notes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Reason for manual entry..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSave}>Add Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift record for {deletingShift?.driver_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
