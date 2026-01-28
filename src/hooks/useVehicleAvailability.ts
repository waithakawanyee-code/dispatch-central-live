import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type DriverSchedule = Database["public"]["Tables"]["driver_schedules"]["Row"];

interface VehicleAvailabilityResult {
  isAvailableForDriver: (vehicleId: string, driverId: string, isAdmin?: boolean) => boolean;
  getVehicleAvailabilityReason: (vehicleId: string, driverId: string) => string | null;
  isOwnerScheduledToday: (vehicle: VehicleRow, schedules: DriverSchedule[]) => boolean;
  isTakeHomeReleasedAsFleet: (vehicle: VehicleRow) => boolean;
  getTakeHomeOwner: (vehicle: VehicleRow, drivers: DriverRow[]) => DriverRow | null;
  getAvailableVehiclesForDriver: (driverId: string, isAdmin?: boolean) => VehicleRow[];
  hasValidTakeHomeOwner: (vehicle: VehicleRow) => boolean;
}

export function useVehicleAvailability(
  vehicles: VehicleRow[],
  drivers: DriverRow[],
  schedules: DriverSchedule[],
): VehicleAvailabilityResult {
  const getTodayDayOfWeek = () => new Date().getDay();

  // Check if a Take Home vehicle's owner is scheduled to work today
  // Treat as "working" if ANY schedule row for today is not marked off
  const isOwnerScheduledToday = (vehicle: VehicleRow, allSchedules: DriverSchedule[]): boolean => {
    if (!vehicle.assigned_driver_id) return false;

    const dow = getTodayDayOfWeek();
    const ownerSchedulesToday = allSchedules.filter(
      (s) => s.driver_id === vehicle.assigned_driver_id && s.day_of_week === dow,
    );

    // If no schedule found, assume owner is OFF (vehicle available)
    if (ownerSchedulesToday.length === 0) return false;

    // Owner is scheduled to work if any schedule row is not off
    return ownerSchedulesToday.some((s) => !s.is_off);
  };

  // Check if a Take Home vehicle has been manually released as fleet for today
  const isTakeHomeReleasedAsFleet = (vehicle: VehicleRow): boolean => {
    if (!vehicle.released_as_fleet_until) return false;

    const releaseEnd = new Date(vehicle.released_as_fleet_until);
    if (Number.isNaN(releaseEnd.getTime())) return false;

    return releaseEnd > new Date();
  };

  // Get the Take Home owner driver
  const getTakeHomeOwner = (vehicle: VehicleRow, allDrivers: DriverRow[]): DriverRow | null => {
    if (!vehicle.assigned_driver_id) return null;
    return allDrivers.find((d) => d.id === vehicle.assigned_driver_id) || null;
  };

  // Check if a Take Home vehicle has a valid owner assigned
  const hasValidTakeHomeOwner = (vehicle: VehicleRow): boolean => {
    if (vehicle.classification !== "take_home") return true;
    return !!vehicle.assigned_driver_id;
  };

  // Determine if a vehicle is available for a specific driver
  const isAvailableForDriver = (vehicleId: string, driverId: string, isAdmin: boolean = false): boolean => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return false;

    // Inactive vehicles are never available
    if (vehicle.status === "inactive") return false;

    // Vehicle must be active
    if (vehicle.status !== "active") return false;

    // Specialty vehicles: always available (different business rules)
    if (vehicle.primary_category === "specialty") return true;

    // Fleet vehicles: always available
    // IMPORTANT: if your DB uses "house" instead of "fleet", change this line back to "house"
    if (vehicle.classification === "fleet") return true;

    // Take Home vehicles have special rules
    if (vehicle.classification === "take_home") {
      // If no owner assigned, invalid / shouldn't be assignable
      if (!hasValidTakeHomeOwner(vehicle)) return false;

      // If released as fleet manually, anyone can use it
      if (isTakeHomeReleasedAsFleet(vehicle)) return true;

      // If owner is the driver being assigned, always allowed
      if (vehicle.assigned_driver_id === driverId) return true;

      // Check if owner is scheduled today
      const ownerWorking = isOwnerScheduledToday(vehicle, schedules);

      // If owner is working today, only owner can use (unless admin override)
      if (ownerWorking) return isAdmin;

      // Owner is off today - vehicle available as fleet
      return true;
    }

    // Default allow
    return true;
  };

  // Get reason why a vehicle is not available for a driver
  const getVehicleAvailabilityReason = (vehicleId: string, driverId: string): string | null => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return "Vehicle not found";

    if (vehicle.status === "inactive") return "Vehicle is inactive (archived)";

    if (vehicle.status !== "active") return "Vehicle is not active";

    if (vehicle.classification === "take_home") {
      if (!hasValidTakeHomeOwner(vehicle)) {
        return "Take Home vehicle has no owner assigned";
      }

      // If not the owner, and owner is working and vehicle not released, reserve it
      if (vehicle.assigned_driver_id !== driverId) {
        const ownerWorking = isOwnerScheduledToday(vehicle, schedules);
        if (ownerWorking && !isTakeHomeReleasedAsFleet(vehicle)) {
          const owner = getTakeHomeOwner(vehicle, drivers);
          return `Reserved for ${owner?.name || "owner"} (scheduled today)`;
        }
      }
    }

    return null;
  };

  // Get all vehicles available for a specific driver
  const getAvailableVehiclesForDriver = (driverId: string, isAdmin: boolean = false): VehicleRow[] => {
    return vehicles.filter((v) => isAvailableForDriver(v.id, driverId, isAdmin));
  };

  return {
    isAvailableForDriver,
    getVehicleAvailabilityReason,
    isOwnerScheduledToday,
    isTakeHomeReleasedAsFleet,
    getTakeHomeOwner,
    getAvailableVehiclesForDriver,
    hasValidTakeHomeOwner,
  };
}
