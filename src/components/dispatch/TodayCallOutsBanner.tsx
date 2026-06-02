import { useEffect, useState } from "react";
import { PhoneOff, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CallOutRow {
  id: string;
  driver_id: string;
  driver_name: string;
  call_out_date: string;
  note: string | null;
  is_call_out: boolean;
  created_at: string;
}

function todayNyDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Compact banner showing TODAY's driver-submitted call-outs, split into
 * "Calling out" (red) vs "Constraints / late" (yellow). Updates live via
 * Supabase realtime so dispatchers see new submissions immediately.
 */
export function TodayCallOutsBanner() {
  const [rows, setRows] = useState<CallOutRow[]>([]);
  const today = todayNyDate();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("call_outs")
        .select("*")
        .eq("call_out_date", today)
        .order("created_at", { ascending: false });
      if (active) setRows((data as CallOutRow[]) ?? []);
    };
    load();

    const channel = supabase
      .channel("dispatch-call-outs-today")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_outs" },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [today]);

  const callOuts = rows.filter((r) => r.is_call_out);
  const constraints = rows.filter((r) => !r.is_call_out);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <Group
        icon={PhoneOff}
        title="Calling out today"
        items={callOuts}
        accent="destructive"
      />
      <Group
        icon={AlertTriangle}
        title="Constraints / Late"
        items={constraints}
        accent="warning"
      />
    </div>
  );
}

function Group({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: CallOutRow[];
  accent: "destructive" | "warning";
}) {
  if (items.length === 0) return null;
  const border =
    accent === "destructive"
      ? "border-destructive/40 bg-destructive/5"
      : "border-yellow-500/40 bg-yellow-500/5";
  const iconColor = accent === "destructive" ? "text-destructive" : "text-yellow-600 dark:text-yellow-500";
  return (
    <div className={cn("rounded-lg border-2 p-3", border)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <div className="text-xs font-bold uppercase tracking-widest">
          {title} ({items.length})
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-mono font-semibold">{c.driver_name}</span>
            {c.note && <span className="text-muted-foreground"> — {c.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
