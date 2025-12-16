import { useState } from "react";
import { Users, Truck, AlertTriangle, Droplets, Clock, ChevronDown, BarChart3 } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { VehicleRow } from "@/components/VehicleRow";
import { ScheduleRow } from "@/components/ScheduleRow";
import { mockSchedule } from "@/data/mockData";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Index = () => {
  const {
    drivers,
    vehicles,
    loading,
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
        {/* Driver & Vehicle Status - Side by Side */}
        <div className="grid gap-4 xl:grid-cols-2 mb-6">
          {/* Driver Status */}
          <section className="rounded-lg border border-border bg-card/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Driver Status
              </h2>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {drivers.length} TOTAL
              </span>
            </div>
            <div className="space-y-2">
              {drivers.map((driver) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  canEdit={isAdmin}
                  onStatusChange={(newStatus) => updateDriverStatus(driver.id, newStatus)}
                />
              ))}
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

        {/* Daily Schedule */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Today's Schedule
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {mockSchedule.length} SHIFTS
            </span>
          </div>

          {/* Schedule Header */}
          <div className="mb-2 grid grid-cols-[1fr_120px_120px_1fr_100px] gap-4 px-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Driver</span>
            <span>Vehicle</span>
            <span>Shift</span>
            <span>Route</span>
            <span>Status</span>
          </div>

          <div className="space-y-1.5">
            {mockSchedule.map((entry) => (
              <ScheduleRow
                key={entry.id}
                entry={entry}
                isActive={entry.status === "on-route"}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
