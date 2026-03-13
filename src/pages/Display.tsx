import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DriverStatusWidget,
  VehicleAvailabilityWidget,
  SpecialtyDeparturesWidget,
  CarwashQueueWidget,
} from "@/components/display/widgets";

const Display = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background p-4 flex flex-col">
      {/* Header bar */}
      <header className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Command Center
          </h1>
          <div className="h-4 w-px bg-border/50" />
          <span className="text-[11px] text-muted-foreground/70 font-mono uppercase tracking-widest">
            {format(currentTime, "EEEE, MMM d")}
          </span>
        </div>

        {/* Live clock */}
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
            {format(currentTime, "HH:mm:ss")}
          </span>
        </div>
      </header>

      {/* Widget Grid - fills remaining space */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-4">
        {/* Row 1: Driver Status (2 cols) + Vehicle Availability (1 col) */}
        <div className="col-span-2">
          <DriverStatusWidget />
        </div>
        <div className="col-span-1">
          <VehicleAvailabilityWidget />
        </div>

        {/* Row 2: Specialty Departures + Carwash Queue */}
        <div className="col-span-1">
          <SpecialtyDeparturesWidget />
        </div>
        <div className="col-span-2">
          <CarwashQueueWidget />
        </div>
      </div>
    </div>
  );
};

export default Display;
