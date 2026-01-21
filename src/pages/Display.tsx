import { useState, useEffect, useMemo } from "react";
import { Monitor, Users, Truck, RefreshCw, Clock, CheckCircle2, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { useDispatchData } from "@/hooks/useDispatchData";
import { DisplayDriverCard } from "@/components/display/DisplayDriverCard";
import { DisplayVehicleCard } from "@/components/display/DisplayVehicleCard";
import { DisplaySection } from "@/components/display/DisplaySection";
import { SpecialtyDepartureCard } from "@/components/display/SpecialtyDepartureCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Helper to sort drivers by code alphabetically
const sortByCode = (drivers: DriverRow[]) => {
  return [...drivers].sort((a, b) => {
    const aCode = a.code || "zzz";
    const bCode = b.code || "zzz";
    return aCode.localeCompare(bCode);
  });
};

const Display = () => {
  const { drivers, vehicles, loading, refetch } = useDispatchData();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await refetch();
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refetch]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // Categorize drivers like workbook
  const categorizedDrivers = useMemo(() => {
    const activeDrivers = drivers.filter((d) => (d as any).is_active !== false);

    // UNCONFIRMED - split by has vehicle vs no vehicle
    const unconfirmed = activeDrivers.filter((d) => d.status === "unconfirmed");
    const unconfirmedWithVehicle = sortByCode(unconfirmed.filter((d) => d.vehicle || d.default_vehicle));
    const unconfirmedNoVehicle = sortByCode(unconfirmed.filter((d) => !d.vehicle && !d.default_vehicle));

    // CONFIRMED - split by dispatched (has vehicle) vs report time (needs vehicle)
    const confirmed = activeDrivers.filter((d) => d.status === "confirmed");
    const confirmedDispatched = sortByCode(confirmed.filter((d) => d.vehicle));
    const confirmedReportTime = sortByCode(confirmed.filter((d) => !d.vehicle));

    // ON THE CLOCK - sorted by code
    const onTheClock = sortByCode(activeDrivers.filter((d) => d.status === "on_the_clock"));

    // DONE - sorted by code
    const done = sortByCode(activeDrivers.filter((d) => d.status === "done"));

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
  }, [drivers]);

  // Categorize vehicles
  const categorizedVehicles = useMemo(() => {
    const activeVehicles = vehicles.filter((v) => v.status === "active");
    
    // Available at base: active, no driver assigned
    const available = activeVehicles.filter((v) => !v.driver);
    
    // Assigned: active, with driver assigned
    const assigned = activeVehicles.filter((v) => v.driver);
    
    // Specialty vehicles with assignments (for departure display)
    const specialtyAssigned = assigned.filter((v) => v.primary_category === "specialty");
    
    // Sort specialty by driver's report time if available
    const specialtyWithTimes = specialtyAssigned.map((v) => {
      const driver = drivers.find((d) => d.name === v.driver);
      return { vehicle: v, driver, reportTime: driver?.report_time };
    }).sort((a, b) => {
      if (!a.reportTime && !b.reportTime) return 0;
      if (!a.reportTime) return 1;
      if (!b.reportTime) return -1;
      return a.reportTime.localeCompare(b.reportTime);
    });

    // Out of service
    const outOfService = vehicles.filter((v) => v.status === "out-of-service");

    return {
      available,
      assigned,
      specialtyWithTimes,
      outOfService,
    };
  }, [vehicles, drivers]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading display data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Command Center Display
            </h1>
            <p className="text-sm text-muted-foreground">Real-time driver and vehicle status</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Last updated: {format(lastUpdated, "HH:mm:ss")}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Drivers */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground border-b border-border pb-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Drivers</span>
              <span className="ml-auto text-sm font-mono text-muted-foreground">
                {drivers.filter((d) => (d as any).is_active !== false).length} active
              </span>
            </div>

            {/* UNCONFIRMED */}
            <DisplaySection
              title="Unconfirmed"
              count={categorizedDrivers.unconfirmed.total}
              icon={<Users className="h-4 w-4" />}
              variant="default"
            >
              {categorizedDrivers.unconfirmed.total === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">All drivers confirmed</p>
              ) : (
                <div className="space-y-2">
                  {/* With Vehicle subcategory */}
                  {categorizedDrivers.unconfirmed.withVehicle.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wide text-blue-400 font-medium px-1">Has Vehicle</span>
                      <div className="grid grid-cols-3 gap-1">
                        {categorizedDrivers.unconfirmed.withVehicle.map((driver) => (
                          <DisplayDriverCard key={driver.id} driver={driver} subcategory="has_vehicle" />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* No Vehicle */}
                  {categorizedDrivers.unconfirmed.noVehicle.length > 0 && (
                    <div className="grid grid-cols-3 gap-1">
                      {categorizedDrivers.unconfirmed.noVehicle.map((driver) => (
                        <DisplayDriverCard key={driver.id} driver={driver} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </DisplaySection>

            {/* CONFIRMED */}
            <DisplaySection
              title="Confirmed"
              count={categorizedDrivers.confirmed.total}
              icon={<CheckCircle2 className="h-4 w-4" />}
              variant="success"
            >
              {categorizedDrivers.confirmed.total === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No drivers confirmed yet</p>
              ) : (
                <div className="space-y-2">
                  {/* Report Time subcategory */}
                  {categorizedDrivers.confirmed.reportTime.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wide text-amber-400 font-medium px-1">Report Time</span>
                      <div className="grid grid-cols-3 gap-1">
                        {categorizedDrivers.confirmed.reportTime.map((driver) => (
                          <DisplayDriverCard key={driver.id} driver={driver} subcategory="report_time" />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Dispatched subcategory */}
                  {categorizedDrivers.confirmed.dispatched.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wide text-emerald-400 font-medium px-1">Dispatched</span>
                      <div className="grid grid-cols-3 gap-1">
                        {categorizedDrivers.confirmed.dispatched.map((driver) => (
                          <DisplayDriverCard key={driver.id} driver={driver} subcategory="dispatched" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DisplaySection>

            {/* ON THE CLOCK */}
            <DisplaySection
              title="On the Clock"
              count={categorizedDrivers.onTheClock.length}
              icon={<Clock className="h-4 w-4" />}
              variant="success"
            >
              {categorizedDrivers.onTheClock.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No drivers on the clock</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {categorizedDrivers.onTheClock.map((driver) => (
                    <DisplayDriverCard key={driver.id} driver={driver} />
                  ))}
                </div>
              )}
            </DisplaySection>

            {/* DONE - Collapsed */}
            {categorizedDrivers.done.length > 0 && (
              <DisplaySection
                title="Done"
                count={categorizedDrivers.done.length}
                icon={<CheckCircle2 className="h-4 w-4" />}
                variant="muted"
              >
                <div className="grid grid-cols-3 gap-1">
                  {categorizedDrivers.done.map((driver) => (
                    <DisplayDriverCard key={driver.id} driver={driver} />
                  ))}
                </div>
              </DisplaySection>
            )}
          </section>

          {/* Right Column - Vehicles */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground border-b border-border pb-2">
              <Truck className="h-5 w-5 text-primary" />
              <span>Vehicles</span>
              <span className="ml-auto text-sm font-mono text-muted-foreground">
                {vehicles.length} total
              </span>
            </div>

            {/* AVAILABLE - At base, ready to assign */}
            <DisplaySection
              title="Available"
              count={categorizedVehicles.available.length}
              icon={<Truck className="h-4 w-4" />}
              variant="default"
            >
              {categorizedVehicles.available.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No vehicles available</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {categorizedVehicles.available.map((vehicle) => (
                    <DisplayVehicleCard key={vehicle.id} vehicle={vehicle} drivers={drivers} />
                  ))}
                </div>
              )}
            </DisplaySection>

            {/* SPECIALTY DEPARTURES - Sorted by time */}
            {categorizedVehicles.specialtyWithTimes.length > 0 && (
              <DisplaySection
                title="Specialty Departures"
                count={categorizedVehicles.specialtyWithTimes.length}
                icon={<Star className="h-4 w-4" />}
                variant="warning"
              >
                <div className="space-y-1">
                  {categorizedVehicles.specialtyWithTimes.map(({ vehicle, driver, reportTime }) => (
                    <SpecialtyDepartureCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      departureTime={reportTime}
                      driver={driver}
                    />
                  ))}
                </div>
              </DisplaySection>
            )}

            {/* ASSIGNED - On the road */}
            <DisplaySection
              title="Assigned"
              count={categorizedVehicles.assigned.length}
              icon={<Truck className="h-4 w-4" />}
              variant="success"
            >
              {categorizedVehicles.assigned.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No vehicles assigned</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {categorizedVehicles.assigned.map((vehicle) => (
                    <DisplayVehicleCard key={vehicle.id} vehicle={vehicle} drivers={drivers} />
                  ))}
                </div>
              )}
            </DisplaySection>

            {/* OUT OF SERVICE */}
            {categorizedVehicles.outOfService.length > 0 && (
              <DisplaySection
                title="Out of Service"
                count={categorizedVehicles.outOfService.length}
                icon={<Truck className="h-4 w-4" />}
                variant="muted"
              >
                <div className="grid grid-cols-3 gap-1">
                  {categorizedVehicles.outOfService.map((vehicle) => (
                    <DisplayVehicleCard key={vehicle.id} vehicle={vehicle} drivers={drivers} />
                  ))}
                </div>
              </DisplaySection>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Display;
