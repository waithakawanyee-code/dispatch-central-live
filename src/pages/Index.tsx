import { useState } from "react";
import { Users, Truck, AlertTriangle, Droplets, Clock, ChevronDown, BarChart3 } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { VehicleRow } from "@/components/VehicleRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Index = () => {
  const {
    drivers,
    vehicles,
    loading,
    recentlyUpdatedDrivers,
    recentlyUpdatedVehicles,
    updateDriverStatus,
    updateVehicleStatus,
    updateVehicleCleanStatus,
  } = useDispatchData();
  const { isAdmin } = useUserRole();
  const [statsOpen, setStatsOpen] = useState(false);

  // Calculate stats
  const availableDrivers = drivers.filter((d) => d.status === "available").length;
  const onRouteDrivers = drivers.filter((d) => d.status === "on-route").length;
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const outOfServiceVehicles = vehicles.filter((v) => v.status === "out-of-service").length;
  const dirtyVehicles = vehicles.filter((v) => v.clean_status === "dirty").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dispatch data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <main className="p-4">
        {/* Driver & Vehicle Status - Stacked */}
        <div className="space-y-4 mb-6">
          {/* Driver Status */}
          <section className="rounded-lg border border-border bg-card/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Driver Status
              </h2>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {drivers.length} TOTAL
              </span>
            </div>
            {/* Color Legend */}
            <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Unassigned</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Assigned</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-status-available" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-status-on-route" />
                <span>On Route</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-status-break" />
                <span>Break</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-status-offline" />
                <span>Offline</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Split Top/Bottom */}
              <div className="flex flex-col gap-3">
                {/* Top - Assigned */}
                <div className="space-y-1">
                  <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                    <span>Assigned</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {drivers.filter((d) => d.status === "assigned").length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {drivers
                      .filter((d) => d.status === "assigned")
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime) => updateDriverStatus(driver.id, newStatus, reportTime)}
                          compact
                        />
                      ))}
                    {drivers.filter((d) => d.status === "assigned").length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No assigned drivers</p>
                    )}
                  </div>
                </div>

                {/* Bottom - Unassigned */}
                <div className="space-y-1">
                  <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                    <span>Unassigned</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {drivers.filter((d) => d.status === "scheduled").length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {drivers
                      .filter((d) => d.status === "scheduled")
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime) => updateDriverStatus(driver.id, newStatus, reportTime)}
                          compact
                        />
                      ))}
                    {drivers.filter((d) => d.status === "scheduled").length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No unassigned drivers</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Split Top/Bottom */}
              <div className="flex flex-col gap-3">
                {/* Top - Currently Clocked In */}
                <div className="space-y-1">
                  <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                    <span>Currently Clocked In</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {drivers.filter((d) => ["available", "on-route", "break", "working"].includes(d.status)).length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {drivers
                      .filter((d) => ["available", "on-route", "break", "working"].includes(d.status))
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime) => updateDriverStatus(driver.id, newStatus, reportTime)}
                          compact
                        />
                      ))}
                    {drivers.filter((d) => ["available", "on-route", "break", "working"].includes(d.status)).length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No drivers clocked in</p>
                    )}
                  </div>
                </div>

                {/* Bottom - Clocked Out */}
                <div className="space-y-1">
                  <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                    <span>Clocked Out</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {drivers.filter((d) => ["offline", "off"].includes(d.status)).length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {drivers
                      .filter((d) => ["offline", "off"].includes(d.status))
                      .map((driver) => (
                        <DriverRow
                          key={driver.id}
                          driver={driver}
                          canEdit={isAdmin}
                          isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                          onStatusChange={(newStatus, reportTime) => updateDriverStatus(driver.id, newStatus, reportTime)}
                          compact
                        />
                      ))}
                    {drivers.filter((d) => ["offline", "off"].includes(d.status)).length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No drivers clocked out</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle Status */}
          <section className="rounded-lg border border-border bg-card/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                Vehicle Status
              </h2>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {vehicles.length} TOTAL
              </span>
            </div>
            <div className="space-y-2">
              {vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  canEdit={isAdmin}
                  isUpdated={recentlyUpdatedVehicles.has(vehicle.id)}
                  onStatusChange={(newStatus) => updateVehicleStatus(vehicle.id, newStatus)}
                  onCleanStatusChange={(newCleanStatus) => updateVehicleCleanStatus(vehicle.id, newCleanStatus)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Stats Overview - Collapsible */}
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen} className="mb-6">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2 hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Stats Overview</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3 grid-cols-3 lg:grid-cols-6">
              <StatsCard
                title="Available"
                value={availableDrivers}
                subtitle="Ready"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="On Route"
                value={onRouteDrivers}
                subtitle="Active"
                icon={Clock}
                accentColor="accent"
              />
              <StatsCard
                title="Total Drivers"
                value={drivers.length}
                subtitle="Registered"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="Active"
                value={activeVehicles}
                subtitle="In operation"
                icon={Truck}
                accentColor="primary"
              />
              <StatsCard
                title="Out of Service"
                value={outOfServiceVehicles}
                subtitle="Attention"
                icon={AlertTriangle}
                accentColor="destructive"
              />
              <StatsCard
                title="Needs Cleaning"
                value={dirtyVehicles}
                subtitle="At base"
                icon={Droplets}
                accentColor="accent"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

      </main>
    </div>
  );
};

export default Index;
