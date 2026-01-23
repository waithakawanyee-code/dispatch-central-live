import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];

interface VehicleSummary {
  id: string;
  unit: string;
  status: Database["public"]["Enums"]["vehicle_status"];
  vehicle_type: VehicleType | null;
  primary_category: Database["public"]["Enums"]["vehicle_primary_category"];
  driver: string | null;
}

interface TicketCount {
  vehicle_id: string;
  count: number;
}

const sedanTypes: VehicleType[] = ["sedan_volvo", "sedan_aviator"];
const suvTypes: VehicleType[] = ["suv"];

export function VehicleAvailabilityWidget() {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [ticketCounts, setTicketCounts] = useState<TicketCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch vehicles (above_all only for sedan/suv counts)
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("id, unit, status, vehicle_type, primary_category, driver");

      // Fetch open ticket counts
      const { data: ticketData } = await supabase
        .from("vehicle_service_tickets")
        .select("vehicle_id")
        .in("ticket_status", ["open", "in_progress", "waiting_parts"]);

      if (vehicleData) {
        setVehicles(vehicleData);
      }

      if (ticketData) {
        // Count tickets per vehicle
        const counts: Record<string, number> = {};
        ticketData.forEach((t) => {
          counts[t.vehicle_id] = (counts[t.vehicle_id] || 0) + 1;
        });
        setTicketCounts(
          Object.entries(counts).map(([vehicle_id, count]) => ({
            vehicle_id,
            count,
          }))
        );
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("display-vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_service_tickets" },
        () => fetchData()
      )
      .subscribe();

    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    // Above All vehicles only (sedan + SUV)
    const aboveAll = vehicles.filter(
      (v) => v.primary_category === "above_all" && v.status === "active"
    );

    const sedans = aboveAll.filter((v) =>
      sedanTypes.includes(v.vehicle_type as VehicleType)
    );
    const suvs = aboveAll.filter((v) =>
      suvTypes.includes(v.vehicle_type as VehicleType)
    );

    const availableSedans = sedans.filter((v) => !v.driver);
    const availableSuvs = suvs.filter((v) => !v.driver);

    const outOfService = vehicles.filter((v) => v.status === "out-of-service");

    // Health counts (vehicles with open tickets)
    const vehiclesWithTickets = new Set(ticketCounts.map((t) => t.vehicle_id));
    const yellowCount = [...aboveAll].filter(
      (v) => !v.driver && vehiclesWithTickets.has(v.id)
    ).length;

    return {
      sedans: {
        available: availableSedans.length,
        total: sedans.length,
      },
      suvs: {
        available: availableSuvs.length,
        total: suvs.length,
      },
      outOfService: outOfService.length,
      withTickets: yellowCount,
    };
  }, [vehicles, ticketCounts]);

  if (loading) {
    return (
      <WidgetCard title="Vehicle Availability" className="h-full">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Vehicle Availability" className="h-full">
      <div className="flex h-full flex-col justify-center gap-6">
        {/* Main counts - large typography */}
        <div className="grid grid-cols-2 gap-8 text-center">
          {/* Sedans */}
          <div>
            <div className="text-6xl font-bold font-mono text-emerald-400">
              {stats.sedans.available}
            </div>
            <div className="text-sm text-muted-foreground font-mono uppercase tracking-wide mt-1">
              Sedans
            </div>
            <div className="text-xs text-muted-foreground/60">
              of {stats.sedans.total} active
            </div>
          </div>

          {/* SUVs */}
          <div>
            <div className="text-6xl font-bold font-mono text-emerald-400">
              {stats.suvs.available}
            </div>
            <div className="text-sm text-muted-foreground font-mono uppercase tracking-wide mt-1">
              SUVs
            </div>
            <div className="text-xs text-muted-foreground/60">
              of {stats.suvs.total} active
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex justify-center gap-8 border-t border-border/30 pt-4 text-sm font-mono">
          {stats.withTickets > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-amber-400">{stats.withTickets} w/ tickets</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-400">{stats.outOfService} OOS</span>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
