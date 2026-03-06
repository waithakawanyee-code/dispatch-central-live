import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ArrowLeft, User, Clock, CalendarOff, Calendar, AlertTriangle, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useDriverTimeOff, type DriverTimeOff } from "@/hooks/useDriverTimeOff";
import { useDriverShifts } from "@/hooks/useDriverShifts";
import { DriverProfileForm } from "@/components/admin/DriverProfileForm";
import { CalendarIcon } from "lucide-react";

const TIME_OFF_LABELS: Record<DriverTimeOff["time_off_type"], string> = {
  vacation: "Vacation", sick: "Sick", personal: "Personal", fmla: "FMLA",
};

const TYPE_COLORS: Record<DriverTimeOff["time_off_type"], string> = {
  vacation: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  sick: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  personal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fmla: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

function formatDuration(inAt: string, outAt: string | null): string {
  if (!outAt) return "Active";
  const mins = differenceInMinutes(new Date(outAt), new Date(inAt));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

const DriverProfile = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const isNewDriver = driverId === "new";
  const { allDrivers, vehicles } = useDispatchData();
  const { timeOffEntries, isLoading: timeOffLoading, addTimeOff } = useDriverTimeOff(isNewDriver ? undefined : driverId);
  const { shifts, isLoading: shiftsLoading, getTotalHours } = useDriverShifts(isNewDriver ? undefined : driverId);
  const [activeTab, setActiveTab] = useState("profile");
  const [addTimeOffOpen, setAddTimeOffOpen] = useState(false);
  const [timeOffType, setTimeOffType] = useState<DriverTimeOff["time_off_type"]>("vacation");
  const [timeOffStartDate, setTimeOffStartDate] = useState<Date>();
  const [timeOffEndDate, setTimeOffEndDate] = useState<Date>();
  const [timeOffNotes, setTimeOffNotes] = useState("");
  const [timeOffSaving, setTimeOffSaving] = useState(false);

  const driver = isNewDriver ? null : allDrivers.find((d) => d.id === driverId);

  // Hours summary
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekShifts = useMemo(() => shifts.filter((s) => {
    const d = new Date(s.punch_in_at);
    return d >= weekStart && d <= weekEnd;
  }), [shifts, weekStart, weekEnd]);

  const monthShifts = useMemo(() => shifts.filter((s) => {
    const d = new Date(s.punch_in_at);
    return d >= monthStart && d <= monthEnd;
  }), [shifts, monthStart, monthEnd]);

  if (!isNewDriver && !driver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Driver not found</p>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="px-4 py-3 flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Admin</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground">
            {isNewDriver ? "Add New Driver" : driver!.name}
          </h1>
          {!isNewDriver && driver!.code && (
            <Badge variant="outline" className="text-xs font-mono text-primary">{driver!.code}</Badge>
          )}
          {!isNewDriver && (
            <Badge variant={driver!.is_active ? "default" : "secondary"} className="text-xs">
              {driver!.is_active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {/* Hours Summary Cards - only for existing drivers */}
        {!isNewDriver && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{getTotalHours(weekShifts).toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">{getTotalHours(monthShifts).toFixed(1)}h</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Shifts</p>
              <p className="text-2xl font-bold">{shifts.length}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            {!isNewDriver && (
              <>
                <TabsTrigger value="hours" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Hours
                </TabsTrigger>
                <TabsTrigger value="timeoff" className="gap-1.5">
                  <CalendarOff className="h-3.5 w-3.5" />
                  Time Off
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="rounded-lg border border-border bg-card p-5 max-w-2xl">
              <DriverProfileForm
                driver={driver as any}
                vehicles={vehicles}
                onSaved={() => {
                  if (isNewDriver) {
                    navigate("/admin");
                  }
                }}
                mode={isNewDriver ? "add" : "edit"}
              />
            </div>
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours">
            {shiftsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : shifts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No shift records found</p>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                      <th className="text-left px-4 py-2 font-medium">Punch In</th>
                      <th className="text-left px-4 py-2 font-medium">Punch Out</th>
                      <th className="text-left px-4 py-2 font-medium">Duration</th>
                      <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-2.5">{format(parseISO(shift.workday_date), "MMM d, yyyy")}</td>
                        <td className="px-4 py-2.5">{format(new Date(shift.punch_in_at), "h:mm a")}</td>
                        <td className="px-4 py-2.5">
                          {shift.punch_out_at ? format(new Date(shift.punch_out_at), "h:mm a") : <Badge variant="outline" className="text-xs">Active</Badge>}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {formatDuration(shift.punch_in_at, shift.punch_out_at)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{shift.vehicle_unit || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Time Off Tab */}
          <TabsContent value="timeoff">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Time Off History</h3>
                <Button size="sm" className="gap-1.5" onClick={() => setAddTimeOffOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Time Off
                </Button>
              </div>

              {timeOffLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : timeOffEntries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No time off records found</p>
              ) : (
                <div className="rounded-lg border border-border bg-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left px-4 py-2 font-medium">Type</th>
                        <th className="text-left px-4 py-2 font-medium">Start</th>
                        <th className="text-left px-4 py-2 font-medium">End</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-left px-4 py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {timeOffEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-secondary/30">
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[entry.time_off_type])}>
                              {TIME_OFF_LABELS[entry.time_off_type]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">{format(parseISO(entry.start_date), "MMM d, yyyy")}</td>
                          <td className="px-4 py-2.5">{format(parseISO(entry.end_date), "MMM d, yyyy")}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs capitalize">{entry.status}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{entry.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Time Off Dialog */}
        <Dialog open={addTimeOffOpen} onOpenChange={setAddTimeOffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Time Off{driver ? ` — ${driver.name}` : ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={timeOffType} onValueChange={(v) => setTimeOffType(v as DriverTimeOff["time_off_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="fmla">FMLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !timeOffStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {timeOffStartDate ? format(timeOffStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={timeOffStartDate} onSelect={setTimeOffStartDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !timeOffEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {timeOffEndDate ? format(timeOffEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={timeOffEndDate} onSelect={setTimeOffEndDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={timeOffNotes} onChange={(e) => setTimeOffNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddTimeOffOpen(false)}>Cancel</Button>
              <Button
                disabled={!timeOffStartDate || !timeOffEndDate || timeOffSaving}
                onClick={async () => {
                  if (!driver || !timeOffStartDate || !timeOffEndDate) return;
                  setTimeOffSaving(true);
                  try {
                    await addTimeOff.mutateAsync({
                      driver_id: driver.id,
                      driver_name: driver.name,
                      time_off_type: timeOffType,
                      start_date: format(timeOffStartDate, "yyyy-MM-dd"),
                      end_date: format(timeOffEndDate, "yyyy-MM-dd"),
                      notes: timeOffNotes.trim() || undefined,
                    });
                    setAddTimeOffOpen(false);
                    setTimeOffStartDate(undefined);
                    setTimeOffEndDate(undefined);
                    setTimeOffNotes("");
                    setTimeOffType("vacation");
                  } catch {
                    // error handled by mutation
                  } finally {
                    setTimeOffSaving(false);
                  }
                }}
              >
                {timeOffSaving ? "Saving..." : "Add Time Off"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DriverProfile;
