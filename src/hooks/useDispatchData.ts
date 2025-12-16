import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverStatus = Database["public"]["Enums"]["driver_status"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];

export function useDispatchData() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);

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
            setDrivers((prev) =>
              prev.map((d) => (d.id === payload.new.id ? (payload.new as DriverRow) : d))
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
            setVehicles((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as VehicleRow) : v))
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
    const { error } = await supabase
      .from("drivers")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", driverId);

    if (error) console.error("Failed to update driver status:", error);
  };

  const updateVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    const { error } = await supabase
      .from("vehicles")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (error) console.error("Failed to update vehicle status:", error);
  };

  const updateVehicleCleanStatus = async (vehicleId: string, newCleanStatus: CleanStatus) => {
    const { error } = await supabase
      .from("vehicles")
      .update({ clean_status: newCleanStatus, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (error) console.error("Failed to update vehicle clean status:", error);
  };

  return {
    drivers,
    vehicles,
    loading,
    updateDriverStatus,
    updateVehicleStatus,
    updateVehicleCleanStatus,
  };
}
