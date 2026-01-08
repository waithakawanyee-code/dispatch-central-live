import { useState, useMemo } from "react";
import { Truck, AlertTriangle, Droplets, BarChart3, ChevronDown, Car, Bus } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { VehicleRow } from "@/components/VehicleRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { useVehicleServiceTickets } from "@/hooks/useVehicleServiceTickets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Vehicle type groupings
const SEDAN_TYPES = ["sedan_volvo", "sedan_aviator"];
const SUV_TYPES = ["suv"];
const ABOVE_ALL_TYPES = [...SEDAN_TYPES, ...SUV_TYPES];

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

  // Group vehicles by category and type
  const groupedVehicles = useMemo(() => {
    const activeVehicles = vehicles.filter((v) => v.status === "active");
    
    // Above All vehicles (Sedans and SUVs)
    const aboveAllVehicles = activeVehicles.filter((v) => 
      v.primary_category === "above_all" || ABOVE_ALL_TYPES.includes(v.vehicle_type || "")
    );
    
    const sedanVehicles = aboveAllVehicles.filter((v) => 
      SEDAN_TYPES.includes(v.vehicle_type || "")
    );
    const suvVehicles = aboveAllVehicles.filter((v) => 
      SUV_TYPES.includes(v.vehicle_type || "")
    );
    
    // Specialty vehicles (everything else that's active)
    const specialtyVehicles = activeVehicles.filter((v) => 
      v.primary_category === "specialty" || 
      (!ABOVE_ALL_TYPES.includes(v.vehicle_type || "") && v.primary_category !== "above_all")
    );
    
    // Out of service
    const outOfServiceVehicles = vehicles.filter((v) => v.status === "out-of-service");
    
    return {
      activeVehicles,
      sedanVehicles,
      suvVehicles,
      aboveAllVehicles,
      specialtyVehicles,
      outOfServiceVehicles,
    };
  }, [vehicles]);

  // Calculate stats
  const cleanVehicles = vehicles.filter((v) => v.clean_status === "clean").length;
  const dirtyVehicles = vehicles.filter((v) => v.clean_status === "dirty").length;
  const vehiclesWithOpenTickets = vehicles.filter(
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

  // Helper to split vehicles into unassigned/assigned columns
  const renderVehicleColumns = (vehicleList: typeof vehicles) => {
    const unassigned = vehicleList.filter((v) => !v.driver);
    const assigned = vehicleList.filter((v) => v.driver);
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
            <span>Unassigned</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              {unassigned.length}
            </span>
          </h4>
          <div className="space-y-2">
            {unassigned.map(renderVehicleRow)}
            {unassigned.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">None</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1">
            <span>Assigned</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              {assigned.length}
            </span>
          </h4>
          <div className="space-y-2">
            {assigned.map(renderVehicleRow)}
            {assigned.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">None</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4 space-y-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Vehicle Workbook
          </h1>
          <p className="text-sm text-muted-foreground">Manage vehicle status and maintenance</p>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
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

        {/* Above All Section */}
        <section className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Car className="h-4 w-4 text-primary" />
              Above All
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {groupedVehicles.aboveAllVehicles.length} TOTAL
            </span>
          </div>

          {/* Sedans Sub-group */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Sedans
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {groupedVehicles.sedanVehicles.length}
              </span>
            </div>
            {groupedVehicles.sedanVehicles.length > 0 ? (
              renderVehicleColumns(groupedVehicles.sedanVehicles)
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No sedan vehicles</p>
            )}
          </div>

          {/* SUVs Sub-group */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                SUVs
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {groupedVehicles.suvVehicles.length}
              </span>
            </div>
            {groupedVehicles.suvVehicles.length > 0 ? (
              renderVehicleColumns(groupedVehicles.suvVehicles)
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">No SUV vehicles</p>
            )}
          </div>
        </section>

        {/* Specialty Section */}
        <section className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bus className="h-4 w-4 text-accent" />
              Specialty
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {groupedVehicles.specialtyVehicles.length} TOTAL
            </span>
          </div>
          {groupedVehicles.specialtyVehicles.length > 0 ? (
            renderVehicleColumns(groupedVehicles.specialtyVehicles)
          ) : (
            <p className="text-xs text-muted-foreground italic py-2">No specialty vehicles</p>
          )}
        </section>

        {/* Out of Service Vehicles */}
        <section className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Out of Service
            </h2>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {groupedVehicles.outOfServiceVehicles.length}
            </span>
          </div>
          <div className="space-y-2">
            {groupedVehicles.outOfServiceVehicles.map(renderVehicleRow)}
            {groupedVehicles.outOfServiceVehicles.length === 0 && (
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
                value={groupedVehicles.activeVehicles.length}
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
                value={groupedVehicles.outOfServiceVehicles.length}
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
