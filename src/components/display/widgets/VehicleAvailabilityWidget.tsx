import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetCard } from "./WidgetCard";
import type { Database } from "@/integrations/supabase/types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface VehicleSummary {
  id: string;
  unit: string;
  status: Database["public"]["Enums"]["vehicle_status"];
  vehicle_type: VehicleType | null;
  primary_category: Database["public"]["Enums"]["vehicle_primary_category"];
  driver: string | null;
}

interface DriverSummary {
  id: string;
  name: string;
  status: DriverStatus;
}

const sedanTypes: VehicleType[] = ["sedan_volvo", "sedan_aviator"];
const suvTypes: VehicleType[] = ["suv"];

export function VehicleAvailabilityWidget() {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: vehicleData }, { data: driverData }] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, unit, status, vehicle_type, primary_category, driver"),
        supabase
          .from("drivers")
          .select("id, name, status")
          .eq("is_active", true),
      ]);

      if (vehicleData) setVehicles(vehicleData);
      if (driverData) setDrivers(driverData);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("display-vehicles-drivers")
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

  const { availableSedans, availableSuvs, workingVehicles, outOfServiceCount } = useMemo(() => {
    // Exclude inactive vehicles from all calculations
    const nonInactiveVehicles = vehicles.filter((v) => v.status !== "inactive");
    
    const aboveAll = nonInactiveVehicles.filter(
      (v) => v.primary_category === "above_all" && v.status === "active"
    );

    const sedans = aboveAll.filter((v) =>
      sedanTypes.includes(v.vehicle_type as VehicleType)
    );
    const suvs = aboveAll.filter((v) =>
      suvTypes.includes(v.vehicle_type as VehicleType)
    );

    const availableSedans = sedans
      .filter((v) => !v.driver)
      .sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }));
    const availableSuvs = suvs
      .filter((v) => !v.driver)
      .sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }));

    const onTheClockDriverNames = new Set(
      drivers.filter((d) => d.status === "on_the_clock").map((d) => d.name)
    );
    const workingVehicles = [...sedans, ...suvs]
      .filter((v) => v.driver && onTheClockDriverNames.has(v.driver))
      .sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }));

    const outOfServiceCount = nonInactiveVehicles.filter((v) => v.status === "out-of-service").length;

    return { availableSedans, availableSuvs, workingVehicles, outOfServiceCount };
  }, [vehicles, drivers]);

  if (loading) {
    return (
      <WidgetCard title="Vehicle Availability" className="h-full">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </WidgetCard>
    );
  }

  const VehicleList = ({ items, label, colorClass }: { items: VehicleSummary[]; label: string; colorClass: string }) => (
    <div className="mb-4">
      <div className={`flex items-center justify-between mb-2 border-b border-border/40 pb-1.5 ${colorClass}`}>
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
        <span className="font-mono text-base font-bold">{items.length}</span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-6 gap-1 font-mono text-sm">
          {items.map((v) => (
            <span key={v.id} className={colorClass}>{v.unit}</span>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground/40 font-mono">—</div>
      )}
    </div>
  );

  return (
    <WidgetCard title="Vehicle Availability" className="h-full">
      <div className="h-full flex flex-col overflow-auto">
        <div className="flex-1">
          <VehicleList items={availableSedans} label="Sedans Available" colorClass="text-emerald-400" />
          <VehicleList items={availableSuvs} label="SUVs Available" colorClass="text-emerald-400" />
        </div>

        <div className="border-t border-border/40 pt-3 mt-2">
          <VehicleList items={workingVehicles} label="Working" colorClass="text-sky-400" />
        </div>

        {outOfServiceCount > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-400 font-mono text-sm">{outOfServiceCount} OOS</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
