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
  on_the_clock: "text-sky-400",
  done: "text-muted-foreground",
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

    const channel = supabase
      .channel("display-drivers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => fetchDrivers()
      )
      .subscribe();

    const interval = setInterval(fetchDrivers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const grouped = {
    unconfirmed: drivers.filter((d) => d.status === "unconfirmed"),
    confirmed: drivers.filter((d) => d.status === "confirmed"),
    on_the_clock: drivers.filter((d) => d.status === "on_the_clock"),
    done: drivers.filter((d) => d.status === "done"),
  };

  const renderDriverList = (driverList: DriverSummary[], status: DriverStatus) => (
    <div className="grid grid-cols-6 gap-1 font-mono text-sm">
      {driverList.map((driver) => (
        <span key={driver.id} className={cn("font-bold", statusColors[status])}>
          {driver.code || driver.name.slice(0, 4).toUpperCase()}
        </span>
      ))}
    </div>
  );

  const StatusSection = ({
    title,
    driverList,
    status,
    colorClass,
  }: {
    title: string;
    driverList: DriverSummary[];
    status: DriverStatus;
    colorClass: string;
  }) => (
    <div className="mb-3">
      <div className={cn("flex items-center gap-2 mb-1 pb-1 border-b border-border/20", colorClass)}>
        <span className="font-mono text-xs uppercase tracking-wide">{title}</span>
        <span className="font-mono text-lg font-bold">{driverList.length}</span>
      </div>
      {driverList.length > 0 ? (
        renderDriverList(driverList, status)
      ) : (
        <div className="text-xs text-muted-foreground/50 font-mono">—</div>
      )}
    </div>
  );

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
        <StatusSection
          title="Unconfirmed"
          driverList={grouped.unconfirmed}
          status="unconfirmed"
          colorClass="text-amber-400"
        />
        <StatusSection
          title="Confirmed"
          driverList={grouped.confirmed}
          status="confirmed"
          colorClass="text-emerald-400"
        />
        <StatusSection
          title="On The Clock"
          driverList={grouped.on_the_clock}
          status="on_the_clock"
          colorClass="text-sky-400"
        />
        <StatusSection
          title="Done"
          driverList={grouped.done}
          status="done"
          colorClass="text-muted-foreground"
        />
      </div>
    </WidgetCard>
  );
}
