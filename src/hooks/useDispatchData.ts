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
  const [allDrivers, setAllDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyUpdatedDrivers, setRecentlyUpdatedDrivers] = useState<Set<string>>(new Set());
  const [recentlyUpdatedVehicles, setRecentlyUpdatedVehicles] = useState<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Filter to only active drivers for dispatch views
  const drivers = allDrivers.filter((d) => (d as any).is_active !== false);

  // Fetch data function (reusable for refetch)
  const fetchData = async () => {
    const [driversRes, vehiclesRes] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("vehicles").select("*").order("unit"),
    ]);

    if (driversRes.data) setAllDrivers(driversRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    setLoading(false);
    // Mark initial load complete after a brief delay
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 1000);
  };

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch function for manual refresh
  const refetch = async () => {
    const [driversRes, vehiclesRes] = await Promise.all([
      supabase.from("drivers").select("*").order("name"),
      supabase.from("vehicles").select("*").order("unit"),
    ]);

    if (driversRes.data) setAllDrivers(driversRes.data);
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
  };

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
            setAllDrivers((prev) =>
              prev.map((d) => (d.id === newDriver.id ? newDriver : d))
            );
          } else if (payload.eventType === "INSERT") {
            setAllDrivers((prev) => [...prev, payload.new as DriverRow]);
          } else if (payload.eventType === "DELETE") {
            setAllDrivers((prev) => prev.filter((d) => d.id !== payload.old.id));
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

  const updateDriverStatus = async (driverId: string, newStatus: DriverStatus, reportTime?: string, vehicle?: string) => {
    const driver = allDrivers.find((d) => d.id === driverId);
    if (!driver) return;

    const oldStatus = driver.status;
    const updateData: { status: DriverStatus; updated_at: string; report_time?: string | null; vehicle?: string | null } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set report_time and vehicle when assigning, clear them for other statuses
    if (newStatus === "assigned") {
      updateData.report_time = reportTime || null;
      updateData.vehicle = vehicle || null;
    } else if (newStatus === "unassigned" || newStatus === "punched-out") {
      updateData.report_time = null;
      updateData.vehicle = null;
    }

    const { error } = await supabase
      .from("drivers")
      .update(updateData)
      .eq("id", driverId);

    if (error) {
      console.error("Failed to update driver status:", error);
    } else {
      await logStatusChange("driver", driverId, driver.name, "status", oldStatus, newStatus);
      
      // Record punch in when status changes to working
      if (newStatus === "working" && oldStatus !== "working") {
        await recordTimePunch(driverId, driver.name, "in");
      } else if (newStatus === "punched-out" && oldStatus !== "punched-out" && oldStatus !== "unassigned") {
        // Record punch out when status changes to punched-out (not from unassigned)
        await recordTimePunch(driverId, driver.name, "out");
      }
    }
  };

  const recordTimePunch = async (driverId: string, driverName: string, punchType: "in" | "out") => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("time_punches")
      .insert({
        driver_id: driverId,
        driver_name: driverName,
        punch_type: punchType,
        punched_by: user?.id,
      });

    if (error) {
      console.error(`Failed to record punch ${punchType}:`, error);
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
    drivers, // Active drivers only (for dispatch views)
    allDrivers, // All drivers including inactive (for admin)
    vehicles,
    loading,
    recentlyUpdatedDrivers,
    recentlyUpdatedVehicles,
    updateDriverStatus,
    updateVehicleStatus,
    updateVehicleCleanStatus,
    refetch,
  };
}
