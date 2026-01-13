import { useMemo } from "react";
import { Users, Truck, Clock, CheckCircle2 } from "lucide-react";
import { DriverWorkbookCard } from "./DriverWorkbookCard";
import { DriverStatusSection } from "./DriverStatusSection";
import { DriverSubcategoryGroup } from "./DriverSubcategoryGroup";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DisplayDriver {
  id: string;
  name: string;
  status: DriverStatus;
  vehicle?: string | null;
  report_time?: string | null;
  has_cdl?: boolean;
  default_vehicle?: string | null;
  shiftData?: {
    punch_in_at?: string | null;
    punch_out_at?: string | null;
    vehicle_unit?: string | null;
  } | null;
}

interface DriverWorkbookPanelProps {
  drivers: DisplayDriver[];
  selectedDriverId: string | null;
  recentlyUpdatedDrivers: Set<string>;
  onDriverSelect: (driverId: string) => void;
  cdlFilter: "all" | "cdl" | "non-cdl";
  isAdmin?: boolean;
}

export function DriverWorkbookPanel({
  drivers,
  selectedDriverId,
  recentlyUpdatedDrivers,
  onDriverSelect,
  cdlFilter,
  isAdmin,
}: DriverWorkbookPanelProps) {
  // Filter drivers by CDL
  const filterByCdl = (driverList: DisplayDriver[]) => {
    return driverList.filter((d) => {
      if (cdlFilter === "cdl") return d.has_cdl;
      if (cdlFilter === "non-cdl") return !d.has_cdl;
      return true;
    });
  };

  // Categorize drivers
  const categorizedDrivers = useMemo(() => {
    // UNCONFIRMED - split by has vehicle vs no vehicle
    const unconfirmed = filterByCdl(drivers.filter((d) => d.status === "unconfirmed"));
    const unconfirmedWithVehicle = unconfirmed.filter((d) => d.vehicle || d.default_vehicle);
    const unconfirmedNoVehicle = unconfirmed.filter((d) => !d.vehicle && !d.default_vehicle);

    // CONFIRMED - split by dispatched (has vehicle) vs report time (needs vehicle)
    const confirmed = filterByCdl(drivers.filter((d) => d.status === "confirmed"));
    const confirmedDispatched = confirmed.filter((d) => d.vehicle || d.shiftData?.vehicle_unit);
    const confirmedReportTime = confirmed.filter((d) => !d.vehicle && !d.shiftData?.vehicle_unit);

    // ON THE CLOCK
    const onTheClock = filterByCdl(drivers.filter((d) => d.status === "on_the_clock"));

    // DONE
    const done = filterByCdl(drivers.filter((d) => d.status === "done"));

    return {
      unconfirmed: {
        total: unconfirmed.length,
        withVehicle: unconfirmedWithVehicle,
        noVehicle: unconfirmedNoVehicle,
      },
      confirmed: {
        total: confirmed.length,
        dispatched: confirmedDispatched,
        reportTime: confirmedReportTime,
      },
      onTheClock,
      done,
    };
  }, [drivers, cdlFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN */}
      <div className="space-y-6">
        {/* UNCONFIRMED Section */}
        <DriverStatusSection
          title="Unconfirmed"
          count={categorizedDrivers.unconfirmed.total}
          icon={<Users className="h-4 w-4" />}
          variant="default"
        >
          {categorizedDrivers.unconfirmed.total === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              All drivers confirmed
            </p>
          ) : (
            <div className="space-y-4">
              {/* Has Vehicle subcategory - take-home drivers not yet confirmed */}
              {categorizedDrivers.unconfirmed.withVehicle.length > 0 && (
                <DriverSubcategoryGroup
                  type="has_vehicle"
                  count={categorizedDrivers.unconfirmed.withVehicle.length}
                >
                  {categorizedDrivers.unconfirmed.withVehicle.map((driver) => (
                    <DriverWorkbookCard
                      key={driver.id}
                      driver={driver}
                      shiftData={driver.shiftData}
                      isSelected={selectedDriverId === driver.id}
                      isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                      onClick={() => onDriverSelect(driver.id)}
                      subcategory="has_vehicle"
                    />
                  ))}
                </DriverSubcategoryGroup>
              )}

              {/* Regular unconfirmed drivers (no vehicle) - no subcategory label */}
              {categorizedDrivers.unconfirmed.noVehicle.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5">
                  {categorizedDrivers.unconfirmed.noVehicle.map((driver) => (
                    <DriverWorkbookCard
                      key={driver.id}
                      driver={driver}
                      shiftData={driver.shiftData}
                      isSelected={selectedDriverId === driver.id}
                      isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                      onClick={() => onDriverSelect(driver.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DriverStatusSection>

        {/* CONFIRMED Section */}
        <DriverStatusSection
          title="Confirmed"
          count={categorizedDrivers.confirmed.total}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="success"
        >
          {categorizedDrivers.confirmed.total === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No drivers confirmed yet
            </p>
          ) : (
            <div className="space-y-4">
              {/* Dispatched - confirmed with vehicle assigned */}
              {categorizedDrivers.confirmed.dispatched.length > 0 && (
                <DriverSubcategoryGroup
                  type="dispatched"
                  count={categorizedDrivers.confirmed.dispatched.length}
                >
                  {categorizedDrivers.confirmed.dispatched.map((driver) => (
                    <DriverWorkbookCard
                      key={driver.id}
                      driver={driver}
                      shiftData={driver.shiftData}
                      isSelected={selectedDriverId === driver.id}
                      isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                      onClick={() => onDriverSelect(driver.id)}
                      subcategory="dispatched"
                    />
                  ))}
                </DriverSubcategoryGroup>
              )}

              {/* Report Time - confirmed but needs vehicle */}
              {categorizedDrivers.confirmed.reportTime.length > 0 && (
                <DriverSubcategoryGroup
                  type="report_time"
                  count={categorizedDrivers.confirmed.reportTime.length}
                >
                  {categorizedDrivers.confirmed.reportTime.map((driver) => (
                    <DriverWorkbookCard
                      key={driver.id}
                      driver={driver}
                      shiftData={driver.shiftData}
                      isSelected={selectedDriverId === driver.id}
                      isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                      onClick={() => onDriverSelect(driver.id)}
                      subcategory="report_time"
                    />
                  ))}
                </DriverSubcategoryGroup>
              )}
            </div>
          )}
        </DriverStatusSection>
      </div>

      {/* RIGHT COLUMN */}
      <div className="space-y-6">
        {/* ON THE CLOCK Section */}
        <DriverStatusSection
          title="On the Clock"
          count={categorizedDrivers.onTheClock.length}
          icon={<Clock className="h-4 w-4" />}
          variant="success"
        >
          {categorizedDrivers.onTheClock.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No drivers on the clock
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {categorizedDrivers.onTheClock.map((driver) => (
                <DriverWorkbookCard
                  key={driver.id}
                  driver={driver}
                  shiftData={driver.shiftData}
                  isSelected={selectedDriverId === driver.id}
                  isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                  onClick={() => onDriverSelect(driver.id)}
                />
              ))}
            </div>
          )}
        </DriverStatusSection>

        {/* DONE Section */}
        <DriverStatusSection
          title="Done"
          count={categorizedDrivers.done.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="muted"
        >
          {categorizedDrivers.done.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No drivers done for the day
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {categorizedDrivers.done.map((driver) => (
                <DriverWorkbookCard
                  key={driver.id}
                  driver={driver}
                  shiftData={driver.shiftData}
                  isSelected={selectedDriverId === driver.id}
                  isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                  onClick={() => onDriverSelect(driver.id)}
                />
              ))}
            </div>
          )}
        </DriverStatusSection>
      </div>
    </div>
  );
}
