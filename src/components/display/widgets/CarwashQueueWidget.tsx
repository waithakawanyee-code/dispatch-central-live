import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import { getTodayInNY } from "@/lib/timezone";
import type { Database } from "@/integrations/supabase/types";

type QueueItemUrgency = Database["public"]["Enums"]["queue_item_urgency"];

interface QueueItem {
  id: string;
  vehicleUnit: string;
  urgency: QueueItemUrgency;
  queueType: "SPECIALTY" | "GENERAL";
  position: number;
}

const urgencyColors: Record<QueueItemUrgency, string> = {
  NORMAL: "text-foreground",
  HIGH: "text-amber-400",
  CRITICAL: "text-red-400",
};

const urgencyBg: Record<QueueItemUrgency, string> = {
  NORMAL: "",
  HIGH: "bg-amber-500/10",
  CRITICAL: "bg-red-500/10",
};

export function CarwashQueueWidget() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = getTodayInNY();

      // Fetch today's queues
      const { data: queues } = await supabase
        .from("cleaning_queues")
        .select("id, queue_type")
        .eq("queue_date", today);

      if (!queues || queues.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const queueIds = queues.map((q) => q.id);
      const queueTypeMap = new Map(queues.map((q) => [q.id, q.queue_type]));

      // Fetch pending items
      const { data: queueItems } = await supabase
        .from("cleaning_queue_items")
        .select("id, vehicle_id, urgency, queue_id, position")
        .in("queue_id", queueIds)
        .eq("status", "PENDING")
        .order("position", { ascending: true });

      if (!queueItems) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get vehicle units
      const vehicleIds = queueItems.map((i) => i.vehicle_id);
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, unit")
        .in("id", vehicleIds);

      const vehicleMap = new Map((vehicles || []).map((v) => [v.id, v.unit]));

      const mapped: QueueItem[] = queueItems.map((item) => ({
        id: item.id,
        vehicleUnit: vehicleMap.get(item.vehicle_id) || "???",
        urgency: item.urgency,
        queueType: queueTypeMap.get(item.queue_id) as "SPECIALTY" | "GENERAL",
        position: item.position,
      }));

      // Sort: specialty first, then by position
      mapped.sort((a, b) => {
        if (a.queueType !== b.queueType) {
          return a.queueType === "SPECIALTY" ? -1 : 1;
        }
        return a.position - b.position;
      });

      setItems(mapped);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("display-carwash")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cleaning_queue_items" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cleaning_queues" },
        () => fetchData()
      )
      .subscribe();

    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <WidgetCard title="Carwash Queue" className="h-full">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </WidgetCard>
    );
  }

  const specialtyItems = items.filter((i) => i.queueType === "SPECIALTY");
  const generalItems = items.filter((i) => i.queueType === "GENERAL");

  return (
    <WidgetCard title="Carwash Queue" className="h-full">
      <div className="h-full overflow-auto font-mono">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground/50 text-[11px] uppercase tracking-widest">
            Queue Empty
          </div>
        ) : (
          <div className="space-y-4">
            {/* Specialty section */}
            {specialtyItems.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-purple-400 mb-1.5 tracking-widest font-semibold">
                  Specialty ({specialtyItems.length})
                </div>
                <div className="space-y-0.5">
                  {specialtyItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 py-1 px-2 rounded",
                        urgencyBg[item.urgency]
                      )}
                    >
                      <span className="text-xs text-muted-foreground w-4">
                        {idx + 1}
                      </span>
                      <span
                        className={cn(
                          "text-base font-bold",
                          urgencyColors[item.urgency]
                        )}
                      >
                        {item.vehicleUnit}
                      </span>
                      {item.urgency !== "NORMAL" && (
                        <span
                          className={cn(
                            "text-[9px] px-1 rounded uppercase",
                            item.urgency === "HIGH"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {item.urgency}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General section */}
            {generalItems.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">
                  General ({generalItems.length})
                </div>
                <div className="space-y-0.5">
                  {generalItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 py-1 px-2 rounded",
                        urgencyBg[item.urgency]
                      )}
                    >
                      <span className="text-xs text-muted-foreground w-4">
                        {idx + 1}
                      </span>
                      <span
                        className={cn(
                          "text-base font-bold",
                          urgencyColors[item.urgency]
                        )}
                      >
                        {item.vehicleUnit}
                      </span>
                      {item.urgency !== "NORMAL" && (
                        <span
                          className={cn(
                            "text-[9px] px-1 rounded uppercase",
                            item.urgency === "HIGH"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {item.urgency}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
