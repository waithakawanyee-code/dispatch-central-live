import { useEffect, useState } from "react";
import { KeyRound, Lock, Unlock, ShieldCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SetPinDialog } from "./SetPinDialog";

interface Props {
  driverId: string;
  driverName: string;
  driverCode: string | null;
  isActive: boolean;
}

interface PortalState {
  has_pin: boolean;
  last_portal_login_at: string | null;
  portal_locked_until: string | null;
  portal_failed_attempts: number;
}

export function DriverPortalAccessSection({ driverId, driverName, driverCode, isActive }: Props) {
  const [state, setState] = useState<PortalState | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<
    { id: string; event_type: string; success: boolean; created_at: string; detail: string | null }[]
  >([]);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const load = async () => {
    // pin_hash is column-revoked from authenticated, so we just request whether it's non-null
    // by checking a flag via a server-safe lookup: query other columns + a separate "has_pin" detect
    const { data } = await supabase
      .from("drivers")
      .select("last_portal_login_at, portal_locked_until, portal_failed_attempts, auth_user_id")
      .eq("id", driverId)
      .maybeSingle();
    if (data) {
      setState({
        has_pin: !!data.auth_user_id, // proxy: if provisioned, a PIN was set
        last_portal_login_at: data.last_portal_login_at,
        portal_locked_until: data.portal_locked_until,
        portal_failed_attempts: data.portal_failed_attempts ?? 0,
      });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const isLocked =
    !!state?.portal_locked_until && new Date(state.portal_locked_until) > new Date();

  const handleUnlock = async () => {
    const { error } = await supabase
      .from("drivers")
      .update({ portal_locked_until: null, portal_failed_attempts: 0 })
      .eq("id", driverId);
    if (error) {
      toast.error("Failed to unlock account");
      return;
    }
    toast.success("Account unlocked");
    load();
  };

  const loadAudit = async () => {
    setAuditOpen((o) => !o);
    if (audit.length) return;
    const { data } = await supabase
      .from("driver_portal_audit")
      .select("id, event_type, success, created_at, detail")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(50);
    setAudit(data ?? []);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        Portal Access
      </h3>

      <div className="rounded-lg border border-border p-4 space-y-3 bg-card/50">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Initials</div>
            <div className="font-mono font-semibold">{driverCode || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant={isActive ? "default" : "outline"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
              {state?.has_pin ? (
                <Badge variant="secondary">PIN set</Badge>
              ) : (
                <Badge variant="outline">No PIN</Badge>
              )}
              {isLocked && <Badge variant="destructive">Locked</Badge>}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Last login</div>
            <div className="text-sm">
              {state?.last_portal_login_at
                ? new Date(state.last_portal_login_at).toLocaleString()
                : "Never"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Failed attempts
            </div>
            <div className="text-sm">{state?.portal_failed_attempts ?? 0}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="default" onClick={() => setPinDialogOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" />
            {state?.has_pin ? "Reset PIN" : "Set PIN"}
          </Button>
          {isLocked && (
            <Button size="sm" variant="outline" onClick={handleUnlock} className="gap-2">
              <Unlock className="h-4 w-4" />
              Unlock Account
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={loadAudit} className="gap-2">
            <History className="h-4 w-4" />
            {auditOpen ? "Hide audit log" : "View audit log"}
          </Button>
        </div>

        {auditOpen && (
          <div className="border-t border-border pt-3 mt-2 max-h-60 overflow-auto">
            {audit.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">No audit entries yet.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {audit.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                    <span
                      className={
                        a.success ? "text-emerald-500" : "text-destructive"
                      }
                    >
                      {a.event_type}
                    </span>
                    {a.detail && <span className="text-muted-foreground">— {a.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <SetPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        driverId={driverId}
        driverName={driverName}
        driverCode={driverCode}
        onSaved={() => {
          setAudit([]);
          load();
        }}
      />
    </div>
  );
}

// silence unused import in some builds
void Lock;
