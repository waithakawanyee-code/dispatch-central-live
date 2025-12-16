import { Users, Truck, CheckCircle, AlertTriangle, Droplets, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverCard } from "@/components/DriverCard";
import { VehicleCard } from "@/components/VehicleCard";
import { ScheduleRow } from "@/components/ScheduleRow";
import { mockDrivers, mockVehicles, mockSchedule } from "@/data/mockData";

const Index = () => {
  // Calculate stats
  const availableDrivers = mockDrivers.filter((d) => d.status === "available").length;
  const onRouteDrivers = mockDrivers.filter((d) => d.status === "on-route").length;
  const activeVehicles = mockVehicles.filter((v) => v.status === "active").length;
  const outOfServiceVehicles = mockVehicles.filter((v) => v.status === "out-of-service").length;
  const vehiclesAtBase = mockVehicles.filter((v) => v.location === "at-base");
  const dirtyVehicles = vehiclesAtBase.filter((v) => v.cleanStatus === "dirty").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Scan line effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-scan-line absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <Header />

      <main className="p-6">
        {/* Stats Overview */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatsCard
            title="Available Drivers"
            value={availableDrivers}
            subtitle="Ready for dispatch"
            icon={Users}
            accentColor="primary"
          />
          <StatsCard
            title="On Route"
            value={onRouteDrivers}
            subtitle="Currently active"
            icon={Clock}
            accentColor="accent"
          />
          <StatsCard
            title="Total Drivers"
            value={mockDrivers.length}
            subtitle="Registered"
            icon={Users}
            accentColor="primary"
          />
          <StatsCard
            title="Active Vehicles"
            value={activeVehicles}
            subtitle="In operation"
            icon={Truck}
            accentColor="primary"
          />
          <StatsCard
            title="Out of Service"
            value={outOfServiceVehicles}
            subtitle="Needs attention"
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
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          {/* Driver Status Board */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Driver Status
              </h2>
              <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
                {mockDrivers.length} TOTAL
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mockDrivers.map((driver) => (
                <DriverCard key={driver.id} driver={driver} />
              ))}
            </div>
          </section>

          {/* Vehicle Status Board */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Truck className="h-5 w-5 text-primary" />
                Vehicle Status
              </h2>
              <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
                {mockVehicles.length} TOTAL
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mockVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </section>
        </div>

        {/* Daily Schedule */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Today's Schedule
            </h2>
            <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
              {mockSchedule.length} SHIFTS
            </span>
          </div>

          {/* Schedule Header */}
          <div className="mb-2 grid grid-cols-[1fr_120px_120px_1fr_100px] gap-4 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Driver</span>
            <span>Vehicle</span>
            <span>Shift</span>
            <span>Route</span>
            <span>Status</span>
          </div>

          <div className="space-y-2">
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
