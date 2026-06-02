import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CurrentDriver {
  id: string;
  name: string;
  code: string | null;
}

export function useCurrentDriver() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<CurrentDriver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("drivers")
        .select("id, name, code")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (active) {
        setDriver(data as CurrentDriver | null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  return { driver, loading };
}
