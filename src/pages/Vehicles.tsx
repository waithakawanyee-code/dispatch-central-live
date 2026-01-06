import { useState } from "react";
import { Truck, AlertTriangle, Droplets, BarChart3, ChevronDown, Car } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { VehicleRow } from "@/components/VehicleRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { useVehicleServiceTickets } from "@/hooks/useVehicleServiceTickets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Vehicles = () => {
  const {
    drivers,
    vehicles,
    loading,
    recentlyUpdatedVehicles,
    updateVehicleCleanStatus,
  } = useDispatchData();
  const { isAdmin } = useUserRole();
  const { getOpenTicketCount, getVehicleTickets } = useVehicleServiceTickets();
  const [statsOpen, setStatsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"above-all" | "specialty">("above-all");

  // Filter by classification - "house" = Above All fleet, "take_home" = Specialty
  const aboveAllVehicles = vehicles.filter((v) => v.classification === "house");
  const specialtyVehicles = vehicles.filter((v) => v.classification === "take_home");

  // Get vehicles for current tab
  const currentVehicles = activeTab === "above-all" ? aboveAllVehicles : specialtyVehicles;

  // Calculate stats for current tab
  const activeVehicles = currentVehicles.filter((v) => v.status === "active");
  const unassignedVehicles = activeVehicles.filter((v) => !v.driver);
  const assignedVehicles = activeVehicles.filter((v) => v.driver);
  const outOfServiceVehicles = currentVehicles.filter((v) => v.status === "out-of-service");
  const cleanVehicles = currentVehicles.filter((v) => v.clean_status === "clean").length;
  const dirtyVehicles = currentVehicles.filter((v) => v.clean_status === "dirty").length;

  // Count vehicles with open tickets (yellow health state)
  const vehiclesWithOpenTickets = currentVehicles.filter(
    (v) => v.status === "active" && getOpenTicketCount(v.id) > 0
  ).length;

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

  const renderVehicleRow = (vehicle: typeof vehicles[0]) => (
    <VehicleRow
      key={vehicle.id}
      vehicle={vehicle}
      canEdit={isAdmin}
      isUpdated={recentlyUpdatedVehicles.has(vehicle.id)}
      onCleanStatusChange={(newCleanStatus) => updateVehicleCleanStatus(vehicle.id, newCleanStatus)}
      drivers={drivers}
      openTicketCount={getOpenTicketCount(vehicle.id)}
      hasAnyTickets={getVehicleTickets(vehicle.id).length > 0}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Vehicle Workbook
            </h1>
            <p className="text-sm text-muted-foreground">Manage vehicle status and maintenance</p>
          </div>
        </div>

        {/* Fleet Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "above-all" | "specialty")} className="mb-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="above-all" className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" />
              Above All
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                {aboveAllVehicles.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="specialty" className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              Specialty
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                {specialtyVehicles.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Active Vehicles - Two Columns */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Truck className="h-4 w-4 text-primary" />
              Active Vehicles
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {activeVehicles.length} TOTAL
            </span>
          </div>

          {/* Color Legend */}
          <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>OK</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Open Ticket(s)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>OOS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Unassigned Vehicles */}
            <div className="space-y-2">
              <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                <span>Unassigned</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                  {unassignedVehicles.length}
                </span>
              </h3>
              <div className="space-y-2">
                {unassignedVehicles.map(renderVehicleRow)}
                {unassignedVehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">No unassigned vehicles</p>
                )}
              </div>
            </div>

            {/* Assigned Vehicles */}
            <div className="space-y-2">
              <h3 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
                <span>Assigned</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                  {assignedVehicles.length}
                </span>
              </h3>
              <div className="space-y-2">
                {assignedVehicles.map(renderVehicleRow)}
                {assignedVehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">No assigned vehicles</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Out of Service Vehicles */}
        <section className="rounded-lg border border-border bg-card/50 p-3 mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Out of Service
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {outOfServiceVehicles.length}
            </span>
          </div>
          <div className="space-y-2">
            {outOfServiceVehicles.map(renderVehicleRow)}
            {outOfServiceVehicles.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">No out of service vehicles</p>
            )}
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
                value={activeVehicles.length}
                subtitle="In operation"
                icon={Truck}
                accentColor="primary"
              />
              <StatsCard
                title="With Open Tickets"
                value={vehiclesWithOpenTickets}
                subtitle="Need attention"
                icon={AlertTriangle}
                accentColor="accent"
              />
              <StatsCard
                title="Out of Service"
                value={outOfServiceVehicles.length}
                subtitle="Reported issues"
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
