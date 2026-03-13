import { Truck, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface SpecialtyDepartureCardProps {
  vehicle: VehicleRow;
  departureTime?: string | null;
  driver?: DriverRow | null;
}

export function SpecialtyDepartureCard({ vehicle, departureTime, driver }: SpecialtyDepartureCardProps) {
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "--:--";
    try {
      if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-3 py-2 border-l-[3px] border-l-purple-500">
      {/* Departure time */}
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <Clock className="h-3.5 w-3.5 text-purple-400" />
        <span className="font-mono text-sm font-semibold text-purple-400 tabular-nums">
          {formatTime(departureTime)}
        </span>
      </div>

      {/* Vehicle unit */}
      <div className="flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-sm font-semibold text-foreground">
          {vehicle.unit}
        </span>
      </div>

      {/* Driver code */}
      <div className="flex items-center gap-1.5 ml-auto">
        {driver ? (
          <>
            <User className="h-3 w-3 text-muted-foreground/70" />
            <span className="font-mono text-[10px] text-muted-foreground/80">
              {driver.code || driver.name.split(' ')[0]}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">Unassigned</span>
        )}
      </div>
    </div>
  );
}
