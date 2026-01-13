import { User, Clock, MapPin, Phone } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  currentLocation?: string;
  shiftStart?: string;
  shiftEnd?: string;
  vehicleId?: string;
}

interface DriverCardProps {
  driver: Driver;
}

export function DriverCard({ driver }: DriverCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all duration-300",
        "hover:border-primary/30 hover:bg-card/80",
        driver.status === "unconfirmed" && "border-l-4 border-l-slate-500",
        driver.status === "confirmed" && "border-l-4 border-l-emerald-500",
        driver.status === "on_the_clock" && "border-l-4 border-l-status-available",
        driver.status === "done" && "border-l-4 border-l-status-offline opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{driver.name}</h3>
            <p className="font-mono text-xs text-muted-foreground">{driver.id}</p>
          </div>
        </div>
        <StatusBadge status={driver.status} showPulse={driver.status !== "done"} size="sm" />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        {driver.currentLocation && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{driver.currentLocation}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span className="font-mono">{driver.phone}</span>
        </div>
        {driver.shiftStart && driver.shiftEnd && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">
              {driver.shiftStart} - {driver.shiftEnd}
            </span>
          </div>
        )}
        {driver.vehicleId && (
          <div className="mt-2 rounded bg-secondary/50 px-2 py-1">
            <span className="font-mono text-xs text-muted-foreground">Vehicle: </span>
            <span className="font-mono text-xs text-primary">{driver.vehicleId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
