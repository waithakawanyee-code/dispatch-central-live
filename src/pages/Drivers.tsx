import { useState, useEffect, useMemo } from "react";
import { Users, BarChart3, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, Clock, PhoneOff } from "lucide-react";
import { format, addDays, isSameDay, startOfDay, getDay } from "date-fns";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DriverSchedule = Database["public"]["Tables"]["driver_schedules"]["Row"];

interface CallOut {
  id: string;
  driver_id: string;
  driver_name: string;
  call_out_date: string;
  note: string | null;
}

const Drivers = () => {
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

  // For future dates, all available drivers show as "unassigned"
  const displayDrivers = useMemo(() => {
    if (isToday) {
      return drivers.map((d) => ({ ...d, schedule: null as { start_time: string | null; end_time: string | null } | null }));
    }
    
    // For future dates, return available drivers with virtual "unassigned" status and schedule
    return (getAvailableDriversWithSchedule || []).map((driver) => ({
      ...driver,
      status: "unassigned" as const,
      vehicle: null,
      report_time: null,
    }));
  }, [isToday, getAvailableDriversWithSchedule, drivers]);

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
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Driver Workbook
          </h1>
          <p className="text-sm text-muted-foreground">Manage driver status and assignments</p>
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
                        className="flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-sm"
                      >
                        <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                        <span className="font-medium text-foreground flex-1">{driver.name}</span>
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
                        className="flex items-center gap-3 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-foreground flex-1">{driver.name}</span>
                        {driver.report_time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{driver.report_time.slice(0, 5)}</span>
                          </div>
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
    </div>
  );
};

export default Drivers;
