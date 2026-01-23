import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DriverSummary {
  id: string;
  code: string | null;
  name: string;
  status: DriverStatus;
}

const statusColors: Record<DriverStatus, string> = {
  unconfirmed: "text-amber-400",
  confirmed: "text-emerald-400",
  on_the_clock: "text-emerald-400",
  done: "text-muted-foreground",
};

const statusLabels: Record<DriverStatus, string> = {
  unconfirmed: "UNCONF",
  confirmed: "CONF",
  on_the_clock: "OTC",
  done: "DONE",
};

export function DriverStatusWidget() {
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, code, name, status")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (!error && data) {
        setDrivers(data);
      }
      setLoading(false);
    };

    fetchDrivers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("display-drivers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => fetchDrivers()
      )
      .subscribe();

    // Auto-refresh every 30s
    const interval = setInterval(fetchDrivers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Group by status for display
  const grouped = {
    unconfirmed: drivers.filter((d) => d.status === "unconfirmed"),
    confirmed: drivers.filter((d) => d.status === "confirmed"),
    on_the_clock: drivers.filter((d) => d.status === "on_the_clock"),
    done: drivers.filter((d) => d.status === "done"),
  };

  if (loading) {
    return (
      <WidgetCard title="Driver Status" className="h-full">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Driver Status" className="h-full">
      <div className="h-full overflow-auto">
        {/* Status counts header */}
        <div className="mb-3 flex gap-4 text-xs font-mono border-b border-border/30 pb-2">
          <span className="text-amber-400">
            UNCONF: {grouped.unconfirmed.length}
          </span>
          <span className="text-emerald-400">
            CONF: {grouped.confirmed.length}
          </span>
          <span className="text-emerald-400">
            OTC: {grouped.on_the_clock.length}
          </span>
          <span className="text-muted-foreground">
            DONE: {grouped.done.length}
          </span>
        </div>

        {/* Driver list - airport board style */}
        <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 font-mono text-sm">
          {drivers
            .filter((d) => d.status !== "done")
            .map((driver) => (
              <div
                key={driver.id}
                className="flex items-center gap-2 py-0.5"
              >
                <span
                  className={cn(
                    "w-12 text-right font-bold",
                    statusColors[driver.status]
                  )}
                >
                  {driver.code || driver.name.slice(0, 4).toUpperCase()}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1 rounded",
                    driver.status === "unconfirmed"
                      ? "bg-amber-500/20 text-amber-400"
                      : driver.status === "confirmed"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  )}
                >
                  {statusLabels[driver.status]}
                </span>
              </div>
            ))}
        </div>
      </div>
    </WidgetCard>
  );
}
