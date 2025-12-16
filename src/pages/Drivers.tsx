import { useState } from "react";
import { Users, BarChart3, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Drivers = () => {
  const {
    drivers,
    vehicles,
    loading,
    recentlyUpdatedDrivers,
    updateDriverStatus,
  } = useDispatchData();
  const { isAdmin } = useUserRole();
  const [statsOpen, setStatsOpen] = useState(false);

  // Calculate stats
  const unassignedDrivers = drivers.filter((d) => d.status === "unassigned" || d.status === "scheduled").length;
  const assignedDrivers = drivers.filter((d) => d.status === "assigned").length;
  const workingDrivers = drivers.filter((d) => ["on-route", "working"].includes(d.status)).length;
  const punchedOutDrivers = drivers.filter((d) => ["offline", "off", "punched-out"].includes(d.status)).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading driver data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Driver Workbook
          </h1>
          <p className="text-sm text-muted-foreground">Manage driver status and assignments</p>
        </div>

        {/* Driver Status */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-6">
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
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span>Unassigned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Assigned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-on-route" />
              <span>Working</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-offline" />
              <span>Punched Out</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              {/* Assigned */}
              <div className="space-y-1">
                <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                  <span>Assigned</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                    {assignedDrivers}
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
                        onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                        availableVehicles={vehicles}
                        compact
                      />
                    ))}
                  {assignedDrivers === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No assigned drivers</p>
                  )}
                </div>
              </div>

              {/* Unassigned */}
              <div className="space-y-1">
                <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                  <span>Unassigned</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                    {unassignedDrivers}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1">
                  {drivers
                    .filter((d) => d.status === "unassigned" || d.status === "scheduled")
                    .map((driver) => (
                      <DriverRow
                        key={driver.id}
                        driver={driver}
                        canEdit={isAdmin}
                        isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                        onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                        availableVehicles={vehicles}
                        compact
                      />
                    ))}
                  {unassignedDrivers === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No unassigned drivers</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              {/* Working */}
              <div className="space-y-1">
                <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                  <span>Working</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                    {workingDrivers}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1">
                  {drivers
                    .filter((d) => ["on-route", "working"].includes(d.status))
                    .map((driver) => (
                      <DriverRow
                        key={driver.id}
                        driver={driver}
                        canEdit={isAdmin}
                        isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                        onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                        availableVehicles={vehicles}
                        compact
                      />
                    ))}
                  {workingDrivers === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers working</p>
                  )}
                </div>
              </div>

              {/* Punched Out */}
              <div className="space-y-1">
                <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                  <span>Punched Out</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                    {punchedOutDrivers}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1">
                  {drivers
                    .filter((d) => ["offline", "off", "punched-out"].includes(d.status))
                    .map((driver) => (
                      <DriverRow
                        key={driver.id}
                        driver={driver}
                        canEdit={isAdmin}
                        isUpdated={recentlyUpdatedDrivers.has(driver.id)}
                        onStatusChange={(newStatus, reportTime, vehicle) => updateDriverStatus(driver.id, newStatus, reportTime, vehicle)}
                        availableVehicles={vehicles}
                        compact
                      />
                    ))}
                  {punchedOutDrivers === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2">No drivers punched out</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Overview - Collapsible */}
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2 hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Stats Overview</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Unassigned"
                value={unassignedDrivers}
                subtitle="Waiting"
                icon={Users}
                accentColor="accent"
              />
              <StatsCard
                title="Assigned"
                value={assignedDrivers}
                subtitle="Ready"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="Working"
                value={workingDrivers}
                subtitle="Active"
                icon={Users}
                accentColor="primary"
              />
              <StatsCard
                title="Punched Out"
                value={punchedOutDrivers}
                subtitle="Done"
                icon={Users}
                accentColor="accent"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </main>
    </div>
  );
};

export default Drivers;