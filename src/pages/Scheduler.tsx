import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";
import { format, addDays, startOfDay, isSameDay } from "date-fns";

interface Schedule {
  id: string;
  driver_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
}

interface DriverWithSchedule {
  id: string;
  name: string;
  status: string;
  schedule: Schedule | null;
}

const Scheduler = () => {
  const { drivers } = useDispatchData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllSchedules();
  }, []);

  const fetchAllSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_schedules")
      .select("*");

    if (!error && data) {
      setSchedules(data);
    }
    setLoading(false);
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
      };
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
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
  const availableDrivers = driversWithSchedules.filter(d => d.schedule && !d.schedule.is_off);
  const offDrivers = driversWithSchedules.filter(d => d.schedule?.is_off);
  const unscheduledDrivers = driversWithSchedules.filter(d => !d.schedule);

  // Generate week days for quick navigation
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

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
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
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
                  {availableDrivers.map(driver => (
                    <div key={driver.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {driver.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{driver.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatTime(driver.schedule?.start_time)} - {formatTime(driver.schedule?.end_time)}
                        </span>
                      </div>
                    </div>
                  ))}
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
                      <Badge variant="secondary">Day Off</Badge>
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
                      <span className="text-sm text-muted-foreground italic">Not scheduled</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drivers.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Drivers</h3>
                <p className="text-sm text-muted-foreground">
                  Add drivers in the admin panel to see their schedules here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Scheduler;
