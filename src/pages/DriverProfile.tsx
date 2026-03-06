import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parseISO, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ArrowLeft, User, Clock, CalendarOff, Calendar, Phone, Mail, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useDriverTimeOff, type DriverTimeOff } from "@/hooks/useDriverTimeOff";
import { useDriverShifts } from "@/hooks/useDriverShifts";

const TIME_OFF_LABELS: Record<DriverTimeOff["time_off_type"], string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
  fmla: "FMLA",
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
  const { allDrivers } = useDispatchData();
  const { timeOffEntries, isLoading: timeOffLoading } = useDriverTimeOff(driverId);
  const { shifts, isLoading: shiftsLoading, getTotalHours } = useDriverShifts(driverId);
  const [activeTab, setActiveTab] = useState("hours");

  const driver = allDrivers.find((d) => d.id === driverId);

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

  if (!driver) {
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
          <h1 className="text-lg font-semibold text-foreground">Driver Profile</h1>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{driver.name}</h2>
                {driver.code && (
                  <Badge variant="outline" className="text-xs font-mono text-primary">
                    {driver.code}
                  </Badge>
                )}
                <Badge variant={driver.is_active ? "default" : "secondary"} className="text-xs">
                  {driver.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {driver.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {driver.phone}
                  </span>
                )}
                {driver.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {driver.email}
                  </span>
                )}
                {driver.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {driver.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hours Summary Cards */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="hours" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="gap-1.5">
              <CalendarOff className="h-3.5 w-3.5" />
              Time Off
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </TabsTrigger>
          </TabsList>

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
          </TabsContent>

          {/* Schedule Tab - placeholder */}
          <TabsContent value="schedule">
            <p className="text-center py-8 text-muted-foreground">Weekly schedule view — managed from Admin → Schedules</p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DriverProfile;
