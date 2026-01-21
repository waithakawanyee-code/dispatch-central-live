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
  // Format time to 24-hour format
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "--:--";
    try {
      // Handle HH:MM:SS format
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
    <div className="flex items-center gap-3 rounded border border-border bg-card px-3 py-2 border-l-4 border-l-purple-500">
      {/* Departure time - prominent */}
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <Clock className="h-3.5 w-3.5 text-purple-400" />
        <span className="font-mono text-sm font-semibold text-purple-400">
          {formatTime(departureTime)}
        </span>
      </div>

      {/* Vehicle unit */}
      <div className="flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-sm font-medium text-foreground">
          {vehicle.unit}
        </span>
      </div>

      {/* Driver code */}
      <div className="flex items-center gap-1.5 ml-auto">
        {driver ? (
          <>
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {driver.code || driver.name.split(' ')[0]}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">Unassigned</span>
        )}
      </div>
    </div>
  );
}
