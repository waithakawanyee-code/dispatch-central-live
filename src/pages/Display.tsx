import { useState, useEffect } from "react";
import { Monitor, Users, Truck, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { useDispatchData } from "@/hooks/useDispatchData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

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

  // Filter to only active drivers
  const activeDrivers = drivers.filter((d) => (d as any).is_active !== false);

  // Group drivers by status (using new status model)
  const confirmedDrivers = activeDrivers.filter((d) => d.status === "confirmed");
  const onTheClockDrivers = activeDrivers.filter((d) => d.status === "on_the_clock");
  const unconfirmedDrivers = activeDrivers.filter((d) => d.status === "unconfirmed");
  const doneDrivers = activeDrivers.filter((d) => d.status === "done");

  // Group vehicles by status
  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const outOfServiceVehicles = vehicles.filter((v) => v.status === "out-of-service");

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
              <span className="ml-auto text-sm font-mono text-muted-foreground">{activeDrivers.length} total</span>
            </div>

            {/* On the Clock */}
            <DriverSection 
              title="On the Clock" 
              count={onTheClockDrivers.length} 
              drivers={onTheClockDrivers} 
              statusColor="bg-status-available"
              bgColor="bg-status-available/5 border-status-available/30"
            />

            {/* Confirmed */}
            <DriverSection 
              title="Confirmed" 
              count={confirmedDrivers.length} 
              drivers={confirmedDrivers} 
              statusColor="bg-emerald-500"
              bgColor="bg-emerald-500/5 border-emerald-500/30"
            />

            {/* Unconfirmed */}
            <DriverSection 
              title="Unconfirmed" 
              count={unconfirmedDrivers.length} 
              drivers={unconfirmedDrivers} 
              statusColor="bg-slate-500"
              bgColor=""
            />

            {/* Done */}
            <DriverSection 
              title="Done" 
              count={doneDrivers.length} 
              drivers={doneDrivers} 
              statusColor="bg-status-offline"
              bgColor="opacity-60"
            />
          </section>

          {/* Right Column - Vehicles */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground border-b border-border pb-2">
              <Truck className="h-5 w-5 text-primary" />
              <span>Vehicles</span>
              <span className="ml-auto text-sm font-mono text-muted-foreground">{vehicles.length} total</span>
            </div>

            {/* Active Vehicles */}
            <div className="space-y-1">
              <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <span>Active</span>
                <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{activeVehicles.length}</span>
              </h3>
              <div className="rounded-lg border border-border bg-card/50 divide-y divide-border">
                {activeVehicles.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-3">No active vehicles</p>
                ) : (
                  activeVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-status-available shrink-0" />
                      <span className="font-mono font-semibold text-primary">{vehicle.unit}</span>
                      {vehicle.driver && (
                        <span className="text-muted-foreground text-xs">→ {vehicle.driver}</span>
                      )}
                      <span className={cn(
                        "ml-auto text-xs px-1.5 py-0.5 rounded",
                        vehicle.clean_status === "clean" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {vehicle.clean_status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Out of Service Vehicles */}
            {outOfServiceVehicles.length > 0 && (
              <div className="space-y-1">
                <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Out of Service</span>
                  <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{outOfServiceVehicles.length}</span>
                </h3>
                <div className="rounded-lg border border-border bg-card/50 divide-y divide-border opacity-60">
                  {outOfServiceVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                      <span className="font-mono font-semibold text-muted-foreground">{vehicle.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

interface DriverSectionProps {
  title: string;
  count: number;
  drivers: any[];
  statusColor: string;
  bgColor?: string;
}

function DriverSection({ title, count, drivers, statusColor, bgColor = "" }: DriverSectionProps) {
  return (
    <div className="space-y-1">
      <h3 className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
        <span>{title}</span>
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{count}</span>
      </h3>
      <div className={cn("rounded-lg border border-border bg-card/50 divide-y divide-border", bgColor)}>
        {drivers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic p-3">No {title.toLowerCase()} drivers</p>
        ) : (
          drivers.map((driver) => (
            <div key={driver.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
              <span className="font-medium text-foreground">{driver.name}</span>
              {driver.has_cdl && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">CDL</span>
              )}
              {driver.vehicle && (
                <span className="ml-auto font-mono text-xs text-primary">{driver.vehicle}</span>
              )}
              {driver.report_time && !driver.vehicle && (
                <span className="ml-auto font-mono text-xs text-muted-foreground">{driver.report_time.slice(0, 5)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Display;
