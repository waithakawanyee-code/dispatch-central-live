import { useState } from "react";
import { Truck, AlertTriangle, Droplets, BarChart3, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { VehicleRow } from "@/components/VehicleRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const Vehicles = () => {
  const {
    vehicles,
    loading,
    recentlyUpdatedVehicles,
    updateVehicleStatus,
    updateVehicleCleanStatus,
  } = useDispatchData();
  const { isAdmin } = useUserRole();
  const [statsOpen, setStatsOpen] = useState(false);

  // Calculate stats
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const outOfServiceVehicles = vehicles.filter((v) => v.status === "out-of-service").length;
  const cleanVehicles = vehicles.filter((v) => v.clean_status === "clean").length;
  const dirtyVehicles = vehicles.filter((v) => v.clean_status === "dirty").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading vehicle data...</p>
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
            <Truck className="h-5 w-5 text-primary" />
            Vehicle Workbook
          </h1>
          <p className="text-sm text-muted-foreground">Manage vehicle status and maintenance</p>
        </div>

        {/* Vehicle Status */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Truck className="h-4 w-4 text-primary" />
              Vehicle Status
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {vehicles.length} TOTAL
            </span>
          </div>

          {/* Color Legend */}
          <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-active" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-out-of-service" />
              <span>Out of Service</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-clean" />
              <span>Clean</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-status-dirty" />
              <span>Dirty</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Vehicles */}
            <div className="space-y-2">
              <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                <span>Active</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                  {activeVehicles}
                </span>
              </h3>
              <div className="space-y-2">
                {vehicles
                  .filter((v) => v.status === "active")
                  .map((vehicle) => (
                    <VehicleRow
                      key={vehicle.id}
                      vehicle={vehicle}
                      canEdit={isAdmin}
                      isUpdated={recentlyUpdatedVehicles.has(vehicle.id)}
                      onStatusChange={(newStatus) => updateVehicleStatus(vehicle.id, newStatus)}
                      onCleanStatusChange={(newCleanStatus) => updateVehicleCleanStatus(vehicle.id, newCleanStatus)}
                    />
                  ))}
                {activeVehicles === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">No active vehicles</p>
                )}
              </div>
            </div>

            {/* Out of Service Vehicles */}
            <div className="space-y-2">
              <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                <span>Out of Service</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                  {outOfServiceVehicles}
                </span>
              </h3>
              <div className="space-y-2">
                {vehicles
                  .filter((v) => v.status === "out-of-service")
                  .map((vehicle) => (
                    <VehicleRow
                      key={vehicle.id}
                      vehicle={vehicle}
                      canEdit={isAdmin}
                      isUpdated={recentlyUpdatedVehicles.has(vehicle.id)}
                      onStatusChange={(newStatus) => updateVehicleStatus(vehicle.id, newStatus)}
                      onCleanStatusChange={(newCleanStatus) => updateVehicleCleanStatus(vehicle.id, newCleanStatus)}
                    />
                  ))}
                {outOfServiceVehicles === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">No out of service vehicles</p>
                )}
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
                title="Clean"
                value={cleanVehicles}
                subtitle="Ready"
                icon={Droplets}
                accentColor="primary"
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

export default Vehicles;