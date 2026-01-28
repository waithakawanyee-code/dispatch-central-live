import { useState, useMemo } from "react";
import { Truck, AlertTriangle, Droplets, BarChart3, ChevronDown, Car, Bus, Rows3, LayoutGrid } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { VehicleRow } from "@/components/VehicleRow";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { useVehicleServiceTickets } from "@/hooks/useVehicleServiceTickets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [compactView, setCompactView] = useState(false);

  // Group vehicles by category and type
  const groupedVehicles = useMemo(() => {
    // Filter out inactive vehicles - they should only appear in admin
    const nonInactiveVehicles = vehicles.filter((v) => v.status !== "inactive");
    const activeVehicles = nonInactiveVehicles.filter((v) => v.status === "active");
    
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
    
    // Out of service (excludes inactive)
    const outOfServiceVehicles = nonInactiveVehicles.filter((v) => v.status === "out-of-service");
    
    return {
      activeVehicles,
      sedanVehicles,
      suvVehicles,
      aboveAllVehicles,
      specialtyVehicles,
      outOfServiceVehicles,
    };
  }, [vehicles]);

  // Create a map of driver IDs to driver names for take home owner lookup
  const driverIdToName = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [drivers]);

  // Get drivers who are currently on the clock (punched in)
  const driversOnTheClock = useMemo(() => {
    return new Set(
      drivers
        .filter((d) => d.status === "on_the_clock")
        .map((d) => d.name)
    );
  }, [drivers]);

  // Helper to get the effective driver name for a vehicle
  // For take home vehicles, use the owner name if no current driver is assigned
  const getEffectiveDriver = (vehicle: typeof vehicles[0]): string | null => {
    // If vehicle has an active driver assigned, use that
    if (vehicle.driver) return vehicle.driver;
    
    // For take home vehicles, use the owner as the effective driver
    if (vehicle.classification === "take_home" && vehicle.assigned_driver_id) {
      return driverIdToName.get(vehicle.assigned_driver_id) || null;
    }
    
    return null;
  };

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

  // Helper to render vehicles in a 2-column grid
  const renderVehicleGrid = (vehicleList: typeof vehicles, showHeader = true, headerLabel = "Unassigned") => {
    return (
      <div>
        {showHeader && (
          <h4 className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border pb-1 mb-1.5">
            <span>{headerLabel}</span>
            <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[9px]">
              {vehicleList.length}
            </span>
          </h4>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {vehicleList.map(renderVehicleRow)}
          {vehicleList.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1 col-span-2">None</p>
          )}
        </div>
      </div>
    );
  };

  // Helper to split vehicles into unassigned/assigned/on-the-road columns or flat grid
  const renderVehicleColumns = (vehicleList: typeof vehicles) => {
    if (compactView) {
      // Compact view: single flat 2-column grid, no headers
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {vehicleList.map(renderVehicleRow)}
          {vehicleList.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1 col-span-2">None</p>
          )}
        </div>
      );
    }
    
    // Use effective driver (accounts for take home vehicle owners)
    const unassigned = vehicleList.filter((v) => !getEffectiveDriver(v));
    // Assigned = has effective driver but driver is NOT on the clock
    const assigned = vehicleList.filter((v) => {
      const effectiveDriver = getEffectiveDriver(v);
      return effectiveDriver && !driversOnTheClock.has(effectiveDriver);
    });
    // On the road = has effective driver AND driver IS on the clock
    const onTheRoad = vehicleList.filter((v) => {
      const effectiveDriver = getEffectiveDriver(v);
      return effectiveDriver && driversOnTheClock.has(effectiveDriver);
    });
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {renderVehicleGrid(unassigned, true, "Unassigned")}
        {renderVehicleGrid(assigned, true, "Assigned")}
        {renderVehicleGrid(onTheRoad, true, "On The Road")}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-3 space-y-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Vehicle Workbook
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Color Legend */}
            <div className="flex gap-3 text-[9px] text-muted-foreground">
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
            {/* Compact View Toggle */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={compactView}
                    onPressedChange={setCompactView}
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    {compactView ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="text-xs">{compactView ? "Show Assigned/Unassigned" : "Compact View"}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {/* Above All Section */}
        <section className="rounded border border-border bg-card/50 p-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Car className="h-3.5 w-3.5 text-primary" />
              Above All
            </h2>
            <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
              {groupedVehicles.aboveAllVehicles.length}
            </span>
          </div>
          {groupedVehicles.aboveAllVehicles.length > 0 ? (
            renderVehicleColumns(groupedVehicles.aboveAllVehicles)
          ) : (
            <p className="text-xs text-muted-foreground italic py-1">No vehicles</p>
          )}
        </section>

        {/* Specialty Section */}
        <section className="rounded border border-border bg-card/50 p-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Bus className="h-3.5 w-3.5 text-accent" />
              Specialty
            </h2>
            <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
              {groupedVehicles.specialtyVehicles.length}
            </span>
          </div>
          {groupedVehicles.specialtyVehicles.length > 0 ? (
            renderVehicleColumns(groupedVehicles.specialtyVehicles)
          ) : (
            <p className="text-xs text-muted-foreground italic py-1">No specialty vehicles</p>
          )}
        </section>

        {/* Out of Service Vehicles */}
        <section className="rounded border border-border bg-card/50 p-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              Out of Service
            </h2>
            <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
              {groupedVehicles.outOfServiceVehicles.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {groupedVehicles.outOfServiceVehicles.map(renderVehicleRow)}
            {groupedVehicles.outOfServiceVehicles.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-1 col-span-2">No out of service vehicles</p>
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
