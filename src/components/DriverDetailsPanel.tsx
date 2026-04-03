import { useState, useEffect } from "react";
import { X, Phone, Truck, Clock, Award, Home, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getDay, format } from "date-fns";

type DriverRowType = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRowType = Database["public"]["Tables"]["vehicles"]["Row"];
type ShiftRowType = Database["public"]["Tables"]["shifts"]["Row"];

interface DriverDetailsPanelProps {
  driver: DriverRowType | null;
  onClose: () => void;
}

export function DriverDetailsPanel({ driver, onClose }: DriverDetailsPanelProps) {
  const [isAnyHours, setIsAnyHours] = useState(false);
  const [assignedVehicle, setAssignedVehicle] = useState<VehicleRowType | null>(null);
  const [currentShift, setCurrentShift] = useState<ShiftRowType | null>(null);

  useEffect(() => {
    if (!driver) return;

    const fetchDriverData = async () => {
      const todayDate = format(new Date(), "yyyy-MM-dd");
      const dayOfWeek = getDay(new Date());
      const vehicleUnit = driver.vehicle || driver.default_vehicle;
      
      const [scheduleRes, vehicleRes, shiftRes] = await Promise.all([
        supabase
          .from("driver_schedules")
          .select("is_any_hours")
          .eq("driver_id", driver.id)
          .eq("day_of_week", dayOfWeek)
          .maybeSingle(),
        vehicleUnit
          ? supabase
              .from("vehicles")
              .select("*")
              .eq("unit", vehicleUnit)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("shifts")
          .select("*")
          .eq("driver_id", driver.id)
          .eq("workday_date", todayDate)
          .order("punch_in_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      
      if (scheduleRes.data) {
        setIsAnyHours((scheduleRes.data as any).is_any_hours || false);
      } else {
        setIsAnyHours(false);
      }

      if (vehicleRes.data) {
        setAssignedVehicle(vehicleRes.data);
      } else {
        setAssignedVehicle(null);
      }

      if (shiftRes.data) {
        setCurrentShift(shiftRes.data);
      } else {
        setCurrentShift(null);
      }
    };

    fetchDriverData();
  }, [driver?.id, driver?.vehicle, driver?.default_vehicle]);

  if (!driver) return null;

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatPunchTime = (isoTime: string) => {
    const date = new Date(isoTime);
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const isOnTheClock = driver.status === "on_the_clock";
  const isDone = driver.status === "done";

  return (
    <div className="fixed right-4 top-20 z-50 w-80 rounded-lg border border-border bg-card shadow-xl animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2.5 w-2.5 rounded-full",
            driver.status === "unconfirmed" && "bg-slate-500",
            driver.status === "confirmed" && "bg-emerald-500",
            isOnTheClock && "bg-status-available",
            isDone && "bg-status-offline"
          )} />
          <h3 className="font-semibold text-foreground">{driver.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Punched In badge - show for on_the_clock drivers using shift data */}
          {isOnTheClock && currentShift?.punch_in_at && (
            <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>In: {formatPunchTime(currentShift.punch_in_at)}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick Info */}
        <div className="flex items-center gap-3 flex-wrap">
          {driver.code && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded font-mono">
              <User className="h-3 w-3" />
              {driver.code}
            </span>
          )}
          {driver.has_cdl && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded font-semibold">
              <Award className="h-3 w-3" />
              CDL
            </span>
          )}
          {(driver as any).default_vehicle && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              <Home className="h-3 w-3" />
              {(driver as any).default_vehicle}
            </span>
          )}
          {isAnyHours && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded" title="Open to work any shift today">
              <Calendar className="h-3 w-3" />
              Any
            </span>
          )}
        </div>

        {/* Contact Phone */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</h4>
          {driver.phone ? (
            <a 
              href={`tel:${driver.phone}`}
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{driver.phone}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>No phone</span>
            </div>
          )}
        </div>

        {/* Current Assignment / Status Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isOnTheClock ? "Currently Working" : isDone ? "Today's Shift" : "Assignment"}
          </h4>
          <div className="space-y-1.5">
          {/* Vehicle */}
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">
              {driver.vehicle || driver.default_vehicle || <span className="text-muted-foreground">No vehicle</span>}
            </span>
          </div>

          {/* Vehicle phone */}
          {assignedVehicle?.phone && (
            <a 
              href={`tel:${assignedVehicle.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-6"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{assignedVehicle.phone}</span>
            </a>
          )}

          {/* Shift punch in time from shifts table */}
          {isOnTheClock && currentShift?.punch_in_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-mono">
                  Started: {formatPunchTime(currentShift.punch_in_at)}
                </span>
              </div>
            )}

            {/* Done drivers: Show shift start and end times */}
            {isDone && currentShift?.punch_in_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-mono">
                  Start: {formatPunchTime(currentShift.punch_in_at)}
                </span>
              </div>
            )}

            {isDone && currentShift?.punch_out_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-mono">
                  End: {formatPunchTime(currentShift.punch_out_at)}
                </span>
              </div>
            )}

            {/* Unconfirmed/confirmed drivers: Show report time */}
            {!isOnTheClock && !isDone && driver.report_time && (
              <div className="flex items-center gap-2 text-sm bg-amber-500/10 rounded px-2 py-1 -mx-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
                  Report: {formatTime(driver.report_time)}
                </span>
              </div>
            )}
            {!isOnTheClock && !isDone && !driver.report_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">No report time</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">V</kbd> to close
      </div>
    </div>
  );
}