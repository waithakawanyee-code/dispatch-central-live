import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";

interface DepartureItem {
  vehicleId: string;
  vehicleUnit: string;
  departureTime: string | null;
}

export function SpecialtyDeparturesWidget() {
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch specialty vehicles with drivers assigned
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, unit, driver, status")
        .eq("primary_category", "specialty")
        .eq("status", "active")
        .not("driver", "is", null);

      if (!vehicles) {
        setLoading(false);
        return;
      }

      // Get driver names and their report times
      const driverNames = vehicles.map((v) => v.driver).filter(Boolean);
      
      const { data: drivers } = await supabase
        .from("drivers")
        .select("name, report_time")
        .in("name", driverNames);

      const driverMap = new Map(
        (drivers || []).map((d) => [d.name, d.report_time])
      );

      const items: DepartureItem[] = vehicles.map((v) => ({
        vehicleId: v.id,
        vehicleUnit: v.unit,
        departureTime: v.driver ? driverMap.get(v.driver) || null : null,
      }));

      // Sort by departure time
      items.sort((a, b) => {
        if (!a.departureTime && !b.departureTime) return 0;
        if (!a.departureTime) return 1;
        if (!b.departureTime) return -1;
        return a.departureTime.localeCompare(b.departureTime);
      });

      setDepartures(items);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("display-specialty")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => fetchData()
      )
      .subscribe();

    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    try {
      const [hours, minutes] = time.split(":").map(Number);
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } catch {
      return time;
    }
  };

  if (loading) {
    return (
      <WidgetCard title="Specialty Departures" className="h-full">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Specialty Departures" className="h-full">
      <div className="h-full overflow-auto">
        {departures.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground font-mono text-sm">
            NO SCHEDULED DEPARTURES
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono uppercase text-muted-foreground border-b border-border/30 pb-1 mb-2">
              <span>Time</span>
              <span>Vehicle</span>
            </div>

            {/* Departure rows - flight board style */}
            {departures.map((dep) => (
              <div
                key={dep.vehicleId}
                className="grid grid-cols-2 gap-4 py-1.5 border-b border-border/10 font-mono"
              >
                <span className="text-lg font-bold text-purple-400">
                  {formatTime(dep.departureTime)}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {dep.vehicleUnit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
