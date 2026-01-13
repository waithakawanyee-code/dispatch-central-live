import { Clock, MapPin, User, Truck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface ScheduleEntry {
  id: string;
  driverName: string;
  driverId: string;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  route?: string;
  status: DriverStatus;
}

interface ScheduleRowProps {
  entry: ScheduleEntry;
  isActive?: boolean;
}

export function ScheduleRow({ entry, isActive = false }: ScheduleRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_120px_120px_1fr_100px] items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-200",
        isActive && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">{entry.driverName}</p>
          <p className="font-mono text-xs text-muted-foreground">{entry.driverId}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-foreground">{entry.vehicleId}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          {entry.shiftStart} - {entry.shiftEnd}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {entry.route && (
          <>
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-muted-foreground">{entry.route}</span>
          </>
        )}
      </div>

      <StatusBadge status={entry.status} showPulse={entry.status !== "done"} size="sm" />
    </div>
  );
}
