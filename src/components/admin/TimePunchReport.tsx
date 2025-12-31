import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";
import { Clock, Download, ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Calendar, FileText } from "lucide-react";
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

interface TimePunch {
  id: string;
  driver_id: string;
  driver_name: string;
  punch_type: string;
  punch_time: string;
  notes: string | null;
  created_at: string;
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
  const [punches, setPunches] = useState<TimePunch[]>([]);
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
  const [weeklyPunches, setWeeklyPunches] = useState<TimePunch[]>([]);
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
  const [editingPunch, setEditingPunch] = useState<TimePunch | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState<string>("in");
  const [editNotes, setEditNotes] = useState("");

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDriverId, setAddDriverId] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addType, setAddType] = useState<string>("in");
  const [addNotes, setAddNotes] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPunch, setDeletingPunch] = useState<TimePunch | null>(null);

  const fetchPunches = async () => {
    setLoading(true);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("time_punches")
      .select("*")
      .gte("punch_time", startDateTime.toISOString())
      .lte("punch_time", endDateTime.toISOString())
      .order("punch_time", { ascending: false });

    if (error) {
      console.error("Error fetching punches:", error);
    } else {
      setPunches(data || []);
    }
    setLoading(false);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("id, name").order("name");
    if (data) setDrivers(data);
  };

  // Fetch weekly punches
  const fetchWeeklyPunches = async () => {
    setWeeklyLoading(true);
    const startDateTime = new Date(currentWeekStart);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(currentWeekEnd);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("time_punches")
      .select("*")
      .gte("punch_time", startDateTime.toISOString())
      .lte("punch_time", endDateTime.toISOString())
      .order("punch_time", { ascending: true });

    if (!error && data) {
      setWeeklyPunches(data || []);
    }
    setWeeklyLoading(false);
  };

  useEffect(() => {
    fetchPunches();
    fetchDrivers();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchWeeklyPunches();
  }, [currentWeekStart]);

  // Calculate weekly hours per driver per day
  const weeklyDriverHours = useMemo(() => {
    // Create a map: driverId -> { name, dayHours: { [dateStr]: minutes } }
    const driverMap = new Map<string, { name: string; dayHours: Map<string, number> }>();
    
    // Also track all drivers who have punches
    const sortedPunches = [...weeklyPunches].sort(
      (a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
    );

    // Track open sessions
    const openSessions = new Map<string, { inTime: Date; inDateStr: string }>();

    sortedPunches.forEach((punch) => {
      if (!driverMap.has(punch.driver_id)) {
        driverMap.set(punch.driver_id, { name: punch.driver_name, dayHours: new Map() });
      }
      
      if (punch.punch_type === "in") {
        openSessions.set(punch.driver_id, { 
          inTime: new Date(punch.punch_time),
          inDateStr: format(new Date(punch.punch_time), "yyyy-MM-dd")
        });
      } else if (punch.punch_type === "out") {
        const session = openSessions.get(punch.driver_id);
        if (session) {
          const outTime = new Date(punch.punch_time);
          const minutes = (outTime.getTime() - session.inTime.getTime()) / (1000 * 60);
          const outDateStr = format(outTime, "yyyy-MM-dd");
          
          // Add minutes to the punch out day
          const driverData = driverMap.get(punch.driver_id)!;
          const currentMinutes = driverData.dayHours.get(outDateStr) || 0;
          driverData.dayHours.set(outDateStr, currentMinutes + minutes);
          
          openSessions.delete(punch.driver_id);
        }
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
  }, [weeklyPunches]);

  // Calculate total hours per driver
  const driverHours: DriverHours[] = (() => {
    const driverMap = new Map<string, { name: string; punches: TimePunch[] }>();
    
    // Group punches by driver
    punches.forEach((punch) => {
      if (!driverMap.has(punch.driver_id)) {
        driverMap.set(punch.driver_id, { name: punch.driver_name, punches: [] });
      }
      driverMap.get(punch.driver_id)!.punches.push(punch);
    });

    const results: DriverHours[] = [];

    driverMap.forEach((data, driverId) => {
      // Sort punches by time ascending
      const sortedPunches = [...data.punches].sort(
        (a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
      );

      let totalMinutes = 0;
      const sessions: { inTime: Date; outTime: Date | null }[] = [];
      let currentIn: Date | null = null;

      sortedPunches.forEach((punch) => {
        if (punch.punch_type === "in") {
          currentIn = new Date(punch.punch_time);
        } else if (punch.punch_type === "out" && currentIn) {
          const outTime = new Date(punch.punch_time);
          const minutes = (outTime.getTime() - currentIn.getTime()) / (1000 * 60);
          totalMinutes += minutes;
          sessions.push({ inTime: currentIn, outTime });
          currentIn = null;
        }
      });

      // If still clocked in, mark as open session
      if (currentIn) {
        sessions.push({ inTime: currentIn, outTime: null });
      }

      results.push({
        driverId,
        driverName: data.name,
        totalMinutes,
        sessions,
      });
    });

    return results.sort((a, b) => b.totalMinutes - a.totalMinutes);
  })();

  // Calculate daily breakdown
  const dailyBreakdown = (() => {
    const dayMap = new Map<string, Map<string, { name: string; minutes: number; hasOpenSession: boolean }>>();
    
    // Sort all punches by time
    const sortedPunches = [...punches].sort(
      (a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
    );

    // Track open sessions per driver
    const openSessions = new Map<string, Date>();

    sortedPunches.forEach((punch) => {
      const punchDate = format(new Date(punch.punch_time), "yyyy-MM-dd");
      
      if (!dayMap.has(punchDate)) {
        dayMap.set(punchDate, new Map());
      }
      const dayDrivers = dayMap.get(punchDate)!;
      
      if (!dayDrivers.has(punch.driver_id)) {
        dayDrivers.set(punch.driver_id, { name: punch.driver_name, minutes: 0, hasOpenSession: false });
      }
      
      if (punch.punch_type === "in") {
        openSessions.set(punch.driver_id, new Date(punch.punch_time));
      } else if (punch.punch_type === "out") {
        const inTime = openSessions.get(punch.driver_id);
        if (inTime) {
          const outTime = new Date(punch.punch_time);
          const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
          
          // Add minutes to the day of punch out
          const driverData = dayDrivers.get(punch.driver_id)!;
          driverData.minutes += minutes;
          
          openSessions.delete(punch.driver_id);
        }
      }
    });

    // Mark drivers with open sessions
    openSessions.forEach((inTime, driverId) => {
      const dayKey = format(inTime, "yyyy-MM-dd");
      const dayDrivers = dayMap.get(dayKey);
      if (dayDrivers?.has(driverId)) {
        dayDrivers.get(driverId)!.hasOpenSession = true;
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
  })();

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    const headers = ["Driver Name", "Punch Type", "Punch Time", "Notes"];
    const rows = punches.map((p) => [
      p.driver_name,
      p.punch_type === "in" ? "Punch In" : "Punch Out",
      format(new Date(p.punch_time), "yyyy-MM-dd HH:mm:ss"),
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

  const openEditDialog = (punch: TimePunch) => {
    setEditingPunch(punch);
    const punchDate = new Date(punch.punch_time);
    setEditDate(format(punchDate, "yyyy-MM-dd"));
    setEditTime(format(punchDate, "HH:mm"));
    setEditType(punch.punch_type);
    setEditNotes(punch.notes || "");
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingPunch) return;

    const newPunchTime = new Date(`${editDate}T${editTime}`);
    
    const { error } = await supabase
      .from("time_punches")
      .update({
        punch_time: newPunchTime.toISOString(),
        punch_type: editType,
        notes: editNotes || null,
      })
      .eq("id", editingPunch.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update punch record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Punch record updated" });
      setEditDialogOpen(false);
      fetchPunches();
    }
  };

  const openAddDialog = () => {
    const now = new Date();
    setAddDriverId("");
    setAddDate(format(now, "yyyy-MM-dd"));
    setAddTime(format(now, "HH:mm"));
    setAddType("in");
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

    const punchTime = new Date(`${addDate}T${addTime}`);
    
    const { error } = await supabase.from("time_punches").insert({
      driver_id: addDriverId,
      driver_name: driver.name,
      punch_type: addType,
      punch_time: punchTime.toISOString(),
      notes: addNotes || null,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add punch record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Punch record added" });
      setAddDialogOpen(false);
      fetchPunches();
    }
  };

  const openDeleteDialog = (punch: TimePunch) => {
    setDeletingPunch(punch);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPunch) return;

    const { error } = await supabase
      .from("time_punches")
      .delete()
      .eq("id", deletingPunch.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete punch record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Punch record deleted" });
      setDeleteDialogOpen(false);
      fetchPunches();
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
            Add Punch
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={punches.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
          <TabsTrigger value="daterange">Date Range</TabsTrigger>
        </TabsList>

        {/* Weekly Report Tab */}
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
              No time punches found for this week.
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
                      {weeklyDriverHours.map((driver) => (
                        <TableRow key={driver.driverId}>
                          <TableCell className="sticky left-0 bg-background font-mono font-medium">
                            {driver.driverName}
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
                          <TableCell className="text-center font-bold font-mono bg-muted/30">
                            {formatHoursMinutes(driver.weekTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
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
            <Button onClick={fetchPunches} variant="secondary">
              Refresh
            </Button>
          </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : punches.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time punches found for the selected date range.
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punches.map((punch) => (
                <TableRow key={punch.id}>
                  <TableCell className="font-mono font-medium">
                    {punch.driver_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        punch.punch_type === "in"
                          ? "bg-emerald-500/20 text-emerald-600"
                          : "bg-red-500/20 text-red-600"
                      }`}
                    >
                      {punch.punch_type === "in" ? (
                        <ArrowUpCircle className="h-3 w-3" />
                      ) : (
                        <ArrowDownCircle className="h-3 w-3" />
                      )}
                      {punch.punch_type === "in" ? "Punch In" : "Punch Out"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(punch.punch_time), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {punch.notes || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(punch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(punch)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <div className="text-xs text-muted-foreground">
        Total records: {punches.length}
      </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Punch Record</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Driver</Label>
              <Input value={editingPunch?.driver_name || ""} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-time">Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Punch Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Punch In</SelectItem>
                  <SelectItem value="out">Punch Out</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>Add Manual Punch</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-date">Date</Label>
                <Input
                  id="add-date"
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-time">Time</Label>
                <Input
                  id="add-time"
                  type="time"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-type">Punch Type</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Punch In</SelectItem>
                  <SelectItem value="out">Punch Out</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleAddSave}>Add Punch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Punch Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this punch record for {deletingPunch?.driver_name}? This action cannot be undone.
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