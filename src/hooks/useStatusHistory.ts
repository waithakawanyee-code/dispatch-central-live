import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StatusHistoryEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  field_changed: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
}

export function useStatusHistory(limit: number = 50) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("status_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(limit);

      if (data) setHistory(data);
      setLoading(false);
    };

    fetchHistory();
  }, [limit]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("history-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_history" },
        (payload) => {
          setHistory((prev) => [payload.new as StatusHistoryEntry, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { history, loading };
}
