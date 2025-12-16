import { useState } from "react";
import { Users, Truck, AlertTriangle, Droplets, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { DriverRow } from "@/components/DriverRow";
import { VehicleRow } from "@/components/VehicleRow";
import { ScheduleRow } from "@/components/ScheduleRow";
import { mockDrivers as initialDrivers, mockVehicles as initialVehicles, mockSchedule } from "@/data/mockData";

const Index = () => {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [vehicles, setVehicles] = useState(initialVehicles);

  // Calculate stats
  const availableDrivers = drivers.filter((d) => d.status === "available").length;
  const onRouteDrivers = drivers.filter((d) => d.status === "on-route").length;
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const outOfServiceVehicles = vehicles.filter((v) => v.status === "out-of-service").length;
  const vehiclesAtBase = vehicles.filter((v) => v.location === "at-base");
  const dirtyVehicles = vehiclesAtBase.filter((v) => v.cleanStatus === "dirty").length;

  const handleDriverStatusChange = (driverId: string, newStatus: "available" | "on-route" | "break" | "offline") => {
    setDrivers(prev => prev.map(driver => 
      driver.id === driverId ? { ...driver, status: newStatus } : driver
    ));
  };

  const handleVehicleStatusChange = (vehicleId: string, newStatus: "active" | "out-of-service") => {
    setVehicles(prev => prev.map(vehicle => 
      vehicle.id === vehicleId ? { ...vehicle, status: newStatus } : vehicle
    ));
  };

  const handleVehicleCleanStatusChange = (vehicleId: string, newCleanStatus: "clean" | "dirty") => {
    setVehicles(prev => prev.map(vehicle => 
      vehicle.id === vehicleId ? { ...vehicle, cleanStatus: newCleanStatus } : vehicle
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Scan line effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-scan-line absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <Header />

      <main className="p-4">
        {/* Stats Overview */}
        <section className="mb-6 grid gap-3 grid-cols-3 lg:grid-cols-6">
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
        </section>

        {/* Driver & Vehicle Status - Side by Side */}
        <div className="grid gap-4 xl:grid-cols-2">
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
                  onStatusChange={(newStatus) => handleDriverStatusChange(driver.id, newStatus)}
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
                  onStatusChange={(newStatus) => handleVehicleStatusChange(vehicle.id, newStatus)}
                  onCleanStatusChange={(newCleanStatus) => handleVehicleCleanStatusChange(vehicle.id, newCleanStatus)}
                />
              ))}
            </div>
          </section>
        </div>

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
