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

  const updateDriverStatus = async (driverId: string, newStatus: DriverStatus, reportTime?: string, vehicle?: string, punchTime?: string) => {
    const driver = allDrivers.find((d) => d.id === driverId);
    if (!driver) return;

    const oldStatus = driver.status;
    const oldVehicle = driver.vehicle;
    const updateData: { status: DriverStatus; updated_at: string; report_time?: string | null; vehicle?: string | null } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set report_time and vehicle when confirming, clear them for other statuses
    if (newStatus === "confirmed") {
      updateData.report_time = reportTime || null;
      updateData.vehicle = vehicle || null;
    } else if (newStatus === "on_the_clock" && vehicle) {
      // When punching in with a vehicle, set the vehicle
      updateData.vehicle = vehicle;
    } else if (newStatus === "unconfirmed" || newStatus === "done") {
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
      
      // ✅ Sync vehicle's driver field
      if ((newStatus === "confirmed" || newStatus === "on_the_clock") && vehicle) {
        // Set driver on the vehicle
        await supabase
          .from("vehicles")
          .update({ driver: driver.name })
          .eq("unit", vehicle);
      }
      
      // Record vehicle assignment history
      if ((newStatus === "confirmed" || newStatus === "on_the_clock") && vehicle) {
        // Find the vehicle to get its ID and unit
        const assignedVehicle = vehicles.find(v => v.unit === vehicle);
        if (assignedVehicle) {
          await recordVehicleAssignment(assignedVehicle.id, assignedVehicle.unit, driverId, driver.name);
        }
      } else if ((newStatus === "unconfirmed" || newStatus === "done") && oldVehicle) {
        // Close any open assignments for this driver
        await closeVehicleAssignment(driverId);
      }
      
      // Rule B: Mark vehicle dirty on punch-out for non-take-home vehicles
      if (newStatus === "done" && oldStatus !== "done" && oldStatus !== "unconfirmed") {
        if (oldVehicle) {
          await markVehicleDirtyOnPunchOut(oldVehicle);
        }
      }
    }
  };

  const recordVehicleAssignment = async (vehicleId: string, vehicleUnit: string, driverId: string, driverName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // First, close any existing open assignments for this vehicle
    await supabase
      .from("vehicle_assignment_history")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("vehicle_id", vehicleId)
      .is("unassigned_at", null);
    
    // Create new assignment record
    const { error } = await supabase
      .from("vehicle_assignment_history")
      .insert({
        vehicle_id: vehicleId,
        vehicle_unit: vehicleUnit,
        driver_id: driverId,
        driver_name: driverName,
        assigned_by: user?.id,
      });

    if (error) {
      console.error("Failed to record vehicle assignment:", error);
    }
  };

  const closeVehicleAssignment = async (driverId: string) => {
    // Close any open assignments for this driver
    const { error } = await supabase
      .from("vehicle_assignment_history")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("driver_id", driverId)
      .is("unassigned_at", null);

    if (error) {
      console.error("Failed to close vehicle assignment:", error);
    }
  };


  // Rule B: Mark vehicle dirty on punch-out for non-take-home vehicles
  // Also clears the driver field for fleet vehicles
  const markVehicleDirtyOnPunchOut = async (vehicleUnit: string) => {
    // Find the vehicle by unit
    const vehicle = vehicles.find(v => v.unit === vehicleUnit);
    if (!vehicle) {
      console.log("[Rule B] Vehicle not found:", vehicleUnit);
      return;
    }

    // Check conditions
    const isAboveAll = vehicle.primary_category === "above_all";
    const isNotExempt = !(vehicle as any).always_clean_exempt;
    const isFleetVehicle = vehicle.classification === "fleet";

    console.log(`[Rule B] Checking vehicle ${vehicle.unit}: above_all=${isAboveAll}, not_exempt=${isNotExempt}, fleet=${isFleetVehicle}`);

    // For fleet vehicles, always clear the driver (return to unassigned)
    // and mark dirty if above_all and not exempt
    if (isFleetVehicle) {
      const now = new Date().toISOString();
      const idempotencyKey = `punch_out_${vehicle.id}_${now.replace(/[:.]/g, "_")}`;

      const updateData: Record<string, unknown> = {
        driver: null, // Always clear driver for fleet vehicles
      };

      // Only mark dirty if above_all and not exempt
      if (isAboveAll && isNotExempt) {
        // Skip if already dirty with this reason
        if (vehicle.clean_status === "dirty" && (vehicle as any).dirty_reason === "PUNCH_OUT_NON_TAKE_HOME") {
          console.log(`[Rule B] Skipping dirty status for ${vehicle.unit} - already dirty with PUNCH_OUT_NON_TAKE_HOME`);
        } else {
          updateData.clean_status = "dirty";
          updateData.dirty_reason = "PUNCH_OUT_NON_TAKE_HOME";
          updateData.last_marked_dirty_at = now;
          updateData.clean_status_updated_at = now;
          updateData.clean_status_source = "automation";
        }
      }

      // Update the vehicle
      const { error: updateError } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", vehicle.id);

      if (updateError) {
        console.error(`[Rule B] Error updating ${vehicle.unit}:`, updateError);
        return;
      }

      // Log the event if we marked it dirty
      if (updateData.clean_status === "dirty") {
        const { error: eventError } = await supabase
          .from("vehicle_status_events")
          .insert({
            vehicle_id: vehicle.id,
            event_type: "CLEAN_STATUS_PUNCH_OUT",
            occurred_at: now,
            source: "automation",
            payload_json: {
              previous_status: vehicle.clean_status,
              new_status: "dirty",
              reason: "PUNCH_OUT_NON_TAKE_HOME",
              classification: vehicle.classification,
            },
            idempotency_key: idempotencyKey,
          });

        if (eventError) {
          console.error(`[Rule B] Error logging event for ${vehicle.unit}:`, eventError);
        }

        await logStatusChange("vehicle", vehicle.id, vehicle.unit, "clean_status", vehicle.clean_status, "dirty");
      }

      console.log(`[Rule B] Updated ${vehicle.unit}: driver=null, dirty=${updateData.clean_status === "dirty"}`);
    } else if (vehicle.classification === "take_home") {
      // Take-home vehicles: just clear the driver (owner remains via assigned_driver_id)
      await supabase
        .from("vehicles")
        .update({ driver: null })
        .eq("id", vehicle.id);
      
      console.log(`[Rule B] Take-home vehicle ${vehicle.unit}: cleared driver, keeping owner`);
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

  const updateVehicleCleanStatus = async (vehicleId: string, newCleanStatus: CleanStatus, reason?: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const oldStatus = vehicle.clean_status;
    const now = new Date().toISOString();
    
    // Prepare update data for manual override
    const updateData: Record<string, unknown> = {
      clean_status: newCleanStatus,
      clean_status_updated_at: now,
      clean_status_source: "manual",
      updated_at: now,
    };

    // If marking clean, update last_wash_at
    if (newCleanStatus === "clean") {
      updateData.last_wash_at = now;
      updateData.dirty_reason = null;
    } else if (newCleanStatus === "dirty") {
      updateData.last_marked_dirty_at = now;
      updateData.dirty_reason = reason || "MANUAL";
    }

    const { error } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", vehicleId);

    if (error) {
      console.error("Failed to update vehicle clean status:", error);
      return;
    }
    
    // Log the status change
    await logStatusChange("vehicle", vehicleId, vehicle.unit, "clean_status", oldStatus, newCleanStatus);

    // Log an event
    const idempotencyKey = `manual_${vehicleId}_${now.replace(/[:.]/g, "_")}`;
    const { error: eventError } = await supabase
      .from("vehicle_status_events")
      .insert({
        vehicle_id: vehicleId,
        event_type: newCleanStatus === "clean" ? "CLEAN_STATUS_MARKED_CLEAN" : "CLEAN_STATUS_MARKED_DIRTY",
        occurred_at: now,
        source: "manual",
        payload_json: {
          previous_status: oldStatus,
          new_status: newCleanStatus,
          reason: newCleanStatus === "dirty" ? (reason || "MANUAL") : null,
        },
        idempotency_key: idempotencyKey,
      });

    if (eventError) {
      console.error("Failed to log clean status event:", eventError);
    }

    console.log(`[Manual] ${vehicle.unit} clean status changed from ${oldStatus} to ${newCleanStatus}`);
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
