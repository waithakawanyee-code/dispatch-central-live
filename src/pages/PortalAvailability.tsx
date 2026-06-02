import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PortalShell } from "@/components/tablet/PortalShell";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayState {
  id?: string;
  day_of_week: number;
  is_off: boolean;
  is_any_hours: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
}

function emptyDay(d: number): DayState {
  return {
    day_of_week: d,
    is_off: false,
    is_any_hours: true,
    start_time: null,
    end_time: null,
    note: null,
  };
}

function PortalAvailabilityInner() {
  const { driver, loading: driverLoading } = useCurrentDriver();
  const [rows, setRows] = useState<DayState[]>(Array.from({ length: 7 }, (_, i) => emptyDay(i)));
  const [original, setOriginal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!driver?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("driver_schedules")
        .select("*")
        .eq("driver_id", driver.id);
      if (error) {
        toast.error("Failed to load schedule");
        setLoading(false);
        return;
      }
      const next = Array.from({ length: 7 }, (_, i) => {
        const found = (data ?? []).find((r) => r.day_of_week === i);
        return found
          ? {
              id: found.id,
              day_of_week: i,
              is_off: found.is_off,
              is_any_hours: found.is_any_hours,
              start_time: found.start_time?.slice(0, 5) ?? null,
              end_time: found.end_time?.slice(0, 5) ?? null,
              note: found.note ?? null,
            }
          : emptyDay(i);
      });
      setRows(next);
      setOriginal(JSON.stringify(next));
      setLoading(false);
    })();
  }, [driver?.id]);

  const dirty = useMemo(() => JSON.stringify(rows) !== original, [rows, original]);

  const update = (i: number, patch: Partial<DayState>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const save = async () => {
    if (!driver?.id) return;
    setSaving(true);
    try {
      for (const row of rows) {
        const payload = {
          driver_id: driver.id,
          day_of_week: row.day_of_week,
          is_off: row.is_off,
          is_any_hours: row.is_off ? false : row.is_any_hours,
          start_time: row.is_off || row.is_any_hours ? null : row.start_time,
          end_time: row.is_off || row.is_any_hours ? null : row.end_time,
          note: row.note?.trim() ? row.note.trim() : null,
        };
        if (row.id) {
          await supabase.from("driver_schedules").update(payload).eq("id", row.id);
        } else {
          await supabase.from("driver_schedules").insert(payload);
        }
      }
      toast.success("Schedule updated");
      // refetch to pick up new ids
      const { data } = await supabase
        .from("driver_schedules")
        .select("*")
        .eq("driver_id", driver.id);
      const next = Array.from({ length: 7 }, (_, i) => {
        const found = (data ?? []).find((r) => r.day_of_week === i);
        return found
          ? {
              id: found.id,
              day_of_week: i,
              is_off: found.is_off,
              is_any_hours: found.is_any_hours,
              start_time: found.start_time?.slice(0, 5) ?? null,
              end_time: found.end_time?.slice(0, 5) ?? null,
              note: found.note ?? null,
            }
          : emptyDay(i);
      });
      setRows(next);
      setOriginal(JSON.stringify(next));
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (driverLoading || loading) {
    return (
      <PortalShell title="My Availability">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="My Availability"
      subtitle="Set your usual weekly availability. Dispatch uses this to plan future days."
    >
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-border bg-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{DAYS[i]}</div>
              <div className="flex items-center gap-3">
                <Label htmlFor={`off-${i}`} className="text-base">
                  {row.is_off ? "Day Off" : "Available"}
                </Label>
                <Switch
                  id={`off-${i}`}
                  checked={!row.is_off}
                  onCheckedChange={(v) => update(i, { is_off: !v })}
                />
              </div>
            </div>

            {!row.is_off && (
              <>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`any-${i}`}
                    checked={row.is_any_hours}
                    onCheckedChange={(v) => update(i, { is_any_hours: v })}
                  />
                  <Label htmlFor={`any-${i}`} className="text-base">
                    Available any hours
                  </Label>
                </div>

                {!row.is_any_hours && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Start</Label>
                      <Input
                        type="time"
                        step={1800}
                        value={row.start_time ?? ""}
                        onChange={(e) =>
                          update(i, { start_time: e.target.value || null })
                        }
                        className="h-12 text-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">End</Label>
                      <Input
                        type="time"
                        step={1800}
                        value={row.end_time ?? ""}
                        onChange={(e) =>
                          update(i, { end_time: e.target.value || null })
                        }
                        className="h-12 text-lg"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="text-sm text-muted-foreground">Note (optional)</Label>
              <Input
                value={row.note ?? ""}
                maxLength={200}
                onChange={(e) => update(i, { note: e.target.value })}
                placeholder="e.g. Pickup kids 3-4pm"
                className="h-12"
              />
            </div>
          </div>
        ))}

        <div className="sticky bottom-4 pt-2">
          <Button
            size="lg"
            className="w-full h-14 text-lg gap-2"
            disabled={!dirty || saving}
            onClick={save}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Changes
          </Button>
        </div>
      </div>
    </PortalShell>
  );
}

export default function PortalAvailability() {
  return (
    <ProtectedRoute allowedRoles={["DRIVER"]}>
      <PortalAvailabilityInner />
    </ProtectedRoute>
  );
}
