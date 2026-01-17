import { useMemo, useState } from "react";
import { Users, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { DriverWorkbookCard } from "./DriverWorkbookCard";
import { DriverStatusSection } from "./DriverStatusSection";
import { DriverSubcategoryGroup } from "./DriverSubcategoryGroup";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DisplayDriver {
  id: string;
  name: string;
  code?: string | null;
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

// Helper to sort drivers by code alphabetically as final sort
const sortByCode = (drivers: DisplayDriver[]) => {
  return [...drivers].sort((a, b) => {
    const aCode = a.code || "zzz";
    const bCode = b.code || "zzz";
    return aCode.localeCompare(bCode);
  });
};

interface DriverWorkbookPanelProps {
  drivers: DisplayDriver[];
  selectedDriverId: string | null;
  recentlyUpdatedDrivers: Set<string>;
  onDriverSelect: (driverId: string) => void;
  onConfirmDriver?: (driverId: string) => void;
  cdlFilter: "all" | "cdl" | "non-cdl";
  isAdmin?: boolean;
}

export function DriverWorkbookPanel({
  drivers,
  selectedDriverId,
  recentlyUpdatedDrivers,
  onDriverSelect,
  onConfirmDriver,
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

  // Categorize drivers and sort each group by code
  const categorizedDrivers = useMemo(() => {
    // UNCONFIRMED - split by has vehicle vs no vehicle
    const unconfirmed = filterByCdl(drivers.filter((d) => d.status === "unconfirmed"));
    const unconfirmedWithVehicle = sortByCode(unconfirmed.filter((d) => d.vehicle || d.default_vehicle));
    const unconfirmedNoVehicle = sortByCode(unconfirmed.filter((d) => !d.vehicle && !d.default_vehicle));

    // CONFIRMED - split by dispatched (has vehicle) vs report time (needs vehicle)
    const confirmed = filterByCdl(drivers.filter((d) => d.status === "confirmed"));
    const confirmedDispatched = sortByCode(confirmed.filter((d) => d.vehicle || d.shiftData?.vehicle_unit));
    const confirmedReportTime = sortByCode(confirmed.filter((d) => !d.vehicle && !d.shiftData?.vehicle_unit));

    // ON THE CLOCK - sorted by code
    const onTheClock = sortByCode(filterByCdl(drivers.filter((d) => d.status === "on_the_clock")));

    // DONE - sorted by code
    const done = sortByCode(filterByCdl(drivers.filter((d) => d.status === "done")));

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
      {/* LEFT COLUMN - UNCONFIRMED */}
      <div className="space-y-6">
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
                      onConfirm={onConfirmDriver}
                      subcategory="has_vehicle"
                    />
                  ))}
                </DriverSubcategoryGroup>
              )}

              {/* Regular unconfirmed drivers (no vehicle) - no subcategory label */}
              {categorizedDrivers.unconfirmed.noVehicle.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
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
      </div>

      {/* RIGHT COLUMN - CONFIRMED + ON THE CLOCK */}
      <div className="space-y-6">
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
              {/* Report Time - confirmed but needs vehicle (on top) */}
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

              {/* Dispatched - confirmed with vehicle assigned (below) */}
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
            </div>
          )}
        </DriverStatusSection>

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
            <div className="grid grid-cols-3 gap-1">
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

        {/* DONE Section - Collapsible */}
        <DoneSection
          drivers={categorizedDrivers.done}
          selectedDriverId={selectedDriverId}
          recentlyUpdatedDrivers={recentlyUpdatedDrivers}
          onDriverSelect={onDriverSelect}
        />
      </div>
    </div>
  );
}

// Separate collapsible Done section component
function DoneSection({
  drivers,
  selectedDriverId,
  recentlyUpdatedDrivers,
  onDriverSelect,
}: {
  drivers: DisplayDriver[];
  selectedDriverId: string | null;
  recentlyUpdatedDrivers: Set<string>;
  onDriverSelect: (driverId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Done</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {drivers.length}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                No drivers done for the day
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {drivers.map((driver) => (
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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
