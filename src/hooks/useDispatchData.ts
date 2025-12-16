import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playAlertForStatus } from "@/lib/audio";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverStatus = Database["public"]["Enums"]["driver_status"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];

async function logStatusChange(
  entityType: "driver" | "vehicle",
  entityId: string,
  entityName: string,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string
) {
  await supabase.from("status_history").insert({
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
  });
}

export function useDispatchData() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyUpdatedDrivers, setRecentlyUpdatedDrivers] = useState<Set<string>>(new Set());
  const [recentlyUpdatedVehicles, setRecentlyUpdatedVehicles] = useState<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const [driversRes, vehiclesRes] = await Promise.all([
        supabase.from("drivers").select("*").order("name"),
        supabase.from("vehicles").select("*").order("unit"),
      ]);

      if (driversRes.data) setDrivers(driversRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      setLoading(false);
      // Mark initial load complete after a brief delay
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 1000);
    };

    fetchData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("dispatch-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newDriver = payload.new as DriverRow;
            const oldDriver = payload.old as DriverRow;
            // Play sound for status changes (not during initial load)
            if (!isInitialLoad.current && oldDriver.status !== newDriver.status) {
              playAlertForStatus(newDriver.status);
            }
            // Flash the updated row
            if (!isInitialLoad.current) {
              setRecentlyUpdatedDrivers((prev) => new Set(prev).add(newDriver.id));
              setTimeout(() => {
                setRecentlyUpdatedDrivers((prev) => {
                  const next = new Set(prev);
                  next.delete(newDriver.id);
                  return next;
                });
              }, 1500);
            }
            setDrivers((prev) =>
              prev.map((d) => (d.id === newDriver.id ? newDriver : d))
            );
          } else if (payload.eventType === "INSERT") {
            setDrivers((prev) => [...prev, payload.new as DriverRow]);
          } else if (payload.eventType === "DELETE") {
            setDrivers((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newVehicle = payload.new as VehicleRow;
            const oldVehicle = payload.old as VehicleRow;
            // Play sound for status changes (not during initial load)
            if (!isInitialLoad.current && oldVehicle.status !== newVehicle.status) {
              playAlertForStatus(newVehicle.status);
            } else if (!isInitialLoad.current && oldVehicle.clean_status !== newVehicle.clean_status) {
              playAlertForStatus(newVehicle.clean_status);
            }
            // Flash the updated row
            if (!isInitialLoad.current) {
              setRecentlyUpdatedVehicles((prev) => new Set(prev).add(newVehicle.id));
              setTimeout(() => {
                setRecentlyUpdatedVehicles((prev) => {
                  const next = new Set(prev);
                  next.delete(newVehicle.id);
                  return next;
                });
              }, 1500);
            }
            setVehicles((prev) =>
              prev.map((v) => (v.id === newVehicle.id ? newVehicle : v))
            );
          } else if (payload.eventType === "INSERT") {
            setVehicles((prev) => [...prev, payload.new as VehicleRow]);
          } else if (payload.eventType === "DELETE") {
            setVehicles((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateDriverStatus = async (driverId: string, newStatus: DriverStatus) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    const oldStatus = driver.status;
    const { error } = await supabase
      .from("drivers")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", driverId);

    if (error) {
      console.error("Failed to update driver status:", error);
    } else {
      await logStatusChange("driver", driverId, driver.name, "status", oldStatus, newStatus);
    }
  };

  const updateVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const oldStatus = vehicle.status;
    const { error } = await supabase
      .from("vehicles")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (error) {
      console.error("Failed to update vehicle status:", error);
    } else {
      await logStatusChange("vehicle", vehicleId, vehicle.unit, "status", oldStatus, newStatus);
    }
  };

  const updateVehicleCleanStatus = async (vehicleId: string, newCleanStatus: CleanStatus) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const oldStatus = vehicle.clean_status;
    const { error } = await supabase
      .from("vehicles")
      .update({ clean_status: newCleanStatus, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (error) {
      console.error("Failed to update vehicle clean status:", error);
    } else {
      await logStatusChange("vehicle", vehicleId, vehicle.unit, "clean_status", oldStatus, newCleanStatus);
    }
  };

  return {
    drivers,
    vehicles,
    loading,
    recentlyUpdatedDrivers,
    recentlyUpdatedVehicles,
    updateDriverStatus,
    updateVehicleStatus,
    updateVehicleCleanStatus,
  };
}
