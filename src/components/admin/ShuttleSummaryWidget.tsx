import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Train, Stethoscope, Users, AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Driver {
  id: string;
  name: string;
  amtrak_trained: boolean;
  amtrak_primary: boolean;
  bph_trained: boolean;
  bph_primary: boolean;
  status: string;
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

const AMTRAK_SHIFTS = [
  { number: 1, label: "Shift 1", start: "03:00", end: "11:00" },
  { number: 2, label: "Shift 2", start: "11:00", end: "19:00" },
  { number: 3, label: "Shift 3", start: "19:00", end: "03:00" },
];

export function ShuttleSummaryWidget() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shuttleSchedules, setShuttleSchedules] = useState<ShuttleSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [driversRes, schedulesRes] = await Promise.all([
      supabase.from("drivers").select("id, name, status, amtrak_trained, amtrak_primary, bph_trained, bph_primary").eq("is_active", true),
      supabase.from("shuttle_schedules").select("*"),
    ]);

    if (driversRes.data) {
      setDrivers(driversRes.data as Driver[]);
    }
    
    if (schedulesRes.data) {
      setShuttleSchedules(schedulesRes.data as ShuttleSchedule[]);
    }
    
    setLoading(false);
  };

  const today = new Date();
  const dayOfWeek = today.getDay();

  // Amtrak data
  const amtrakPrimaryDrivers = drivers.filter(d => d.amtrak_primary);
  const amtrakTrainedDrivers = drivers.filter(d => d.amtrak_trained && !d.amtrak_primary);
  const todayAmtrakSchedules = shuttleSchedules.filter(s => s.program === "amtrak" && s.day_of_week === dayOfWeek);
  
  const amtrakShiftsCovered = AMTRAK_SHIFTS.map(shift => {
    const schedule = todayAmtrakSchedules.find(s => s.shift_number === shift.number);
    const driver = schedule ? drivers.find(d => d.id === schedule.driver_id) : null;
    return {
      ...shift,
      covered: !!driver,
      driver,
    };
  });

  const amtrakCoveredCount = amtrakShiftsCovered.filter(s => s.covered).length;
  const amtrakGapCount = AMTRAK_SHIFTS.length - amtrakCoveredCount;

  // BPH data
  const bphPrimaryDrivers = drivers.filter(d => d.bph_primary);
  const bphTrainedDrivers = drivers.filter(d => d.bph_trained && !d.bph_primary);
  const todayBphSchedules = shuttleSchedules.filter(s => s.program === "bph" && s.day_of_week === dayOfWeek);
  const bphCovered = todayBphSchedules.length > 0;
  const bphAssignedDriver = bphCovered ? drivers.find(d => d.id === todayBphSchedules[0]?.driver_id) : null;

  if (loading) {
    return (
      <div className="rounded-lg border border-border/50 bg-card/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Train className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Shuttle Programs</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Train className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Shuttle Coverage</h3>
          <Badge variant="outline" className="text-xs">{format(today, "EEE, MMM d")}</Badge>
        </div>
        <Link to="/scheduler">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Full Schedule
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* Amtrak Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Amtrak</span>
            </div>
            <div className="flex items-center gap-2">
              {amtrakGapCount > 0 ? (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {amtrakGapCount} Gap{amtrakGapCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge className="text-xs gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Covered
                </Badge>
              )}
            </div>
          </div>

          {/* Shift Status */}
          <div className="grid grid-cols-3 gap-2">
            {amtrakShiftsCovered.map((shift) => (
              <div
                key={shift.number}
                className={cn(
                  "rounded-lg border p-2 text-center",
                  shift.covered
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
                )}
              >
                <div className="text-[10px] font-medium text-muted-foreground uppercase">
                  {shift.label}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {shift.start}–{shift.end}
                </div>
                <div className={cn(
                  "text-xs font-medium mt-1 truncate",
                  shift.covered ? "text-blue-700" : "text-red-600"
                )}>
                  {shift.covered ? shift.driver?.name.split(" ")[0] : "Vacant"}
                </div>
              </div>
            ))}
          </div>

          {/* Amtrak Pool */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{amtrakPrimaryDrivers.length} primary</span>
            <span className="text-border">•</span>
            <span>{amtrakTrainedDrivers.length} trained backup</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* BPH Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">Boston Public Health</span>
            </div>
            <div className="flex items-center gap-2">
              {!bphCovered ? (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No Driver
                </Badge>
              ) : (
                <Badge className="text-xs gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Covered
                </Badge>
              )}
            </div>
          </div>

          {/* BPH Status */}
          <div
            className={cn(
              "rounded-lg border p-3 flex items-center justify-between",
              bphCovered
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {bphCovered && todayBphSchedules[0]?.start_time
                  ? `${todayBphSchedules[0].start_time.slice(0, 5)} – ${todayBphSchedules[0].end_time?.slice(0, 5) || "TBD"}`
                  : "Daily Shift"}
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              bphCovered ? "text-green-700" : "text-red-600"
            )}>
              {bphCovered ? bphAssignedDriver?.name : "Unassigned"}
            </span>
          </div>

          {/* BPH Pool */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{bphPrimaryDrivers.length} primary</span>
            <span className="text-border">•</span>
            <span>{bphTrainedDrivers.length} trained backup</span>
          </div>
        </div>

        {/* Overall Summary */}
        {(amtrakGapCount > 0 || !bphCovered) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <span className="font-medium">Coverage gaps detected.</span>
                <span className="ml-1">
                  {amtrakTrainedDrivers.length + bphTrainedDrivers.length} trained backup drivers available.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
