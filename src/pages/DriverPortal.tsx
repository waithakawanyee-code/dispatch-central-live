import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarOff, Flag, Folder, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { useEmployeeDocuments, useDocumentAcks } from "@/hooks/useEmployeeDocuments";
import { Badge } from "@/components/ui/badge";

const LOGIN_TS_KEY = "driver-portal-login-ts";
const SESSION_MAX_MS = 12 * 60 * 60 * 1000; // 12 hours
const WARN_MS = 10 * 60 * 1000; // 10 min
const TIMEOUT_MS = 12 * 60 * 1000; // 12 min

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DriverPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const now = useClock();
  const [driverName, setDriverName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load driver row for greeting
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("drivers")
        .select("name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (active) {
        setDriverName(data?.name ?? "");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const signOut = async () => {
    localStorage.removeItem(LOGIN_TS_KEY);
    await supabase.auth.signOut();
    navigate("/tablet", { replace: true });
  };

  // 12-hour absolute session cap
  useEffect(() => {
    const ts = Number(localStorage.getItem(LOGIN_TS_KEY) ?? "0");
    if (!ts) {
      localStorage.setItem(LOGIN_TS_KEY, Date.now().toString());
      return;
    }
    const check = () => {
      if (Date.now() - ts > SESSION_MAX_MS) {
        signOut();
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { warned, reset } = useIdleTimeout({
    warnAfterMs: WARN_MS,
    signOutAfterMs: TIMEOUT_MS,
    onWarn: () => {},
    onTimeout: () => {
      signOut();
    },
  });

  const firstName = useMemo(() => driverName.split(/\s+/)[0] ?? "", [driverName]);
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/50 px-8 py-5 flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight">Hello, {firstName || "Driver"}</div>
          <div className="text-sm text-muted-foreground uppercase tracking-widest mt-1">
            Above All Transportation
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-3xl font-mono tabular-nums text-muted-foreground">{timeStr}</div>
          <Button variant="outline" size="lg" onClick={signOut} className="h-12 gap-2">
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortalCard icon={Calendar} title="My Availability" onClick={() => navigate("/portal/availability")} />
          <PortalCard icon={CalendarOff} title="Time Off" onClick={() => navigate("/portal/time-off")} />
          <PortalCard icon={Flag} title="Flag Something for Today" onClick={() => navigate("/portal/today")} />
          <MyFolderCard onClick={() => navigate("/portal/folder")} />
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground uppercase tracking-widest border-t border-border/50">
        Above All Transportation Driver Portal
      </footer>

      <Dialog open={warned} onOpenChange={(o) => !o && reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Still here?</DialogTitle>
            <DialogDescription>
              You'll be signed out automatically for security. Tap below to stay signed in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={reset} size="lg" className="w-full">
              Stay signed in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PortalCard({
  icon: Icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left rounded-2xl border-2 border-border bg-card p-8 min-h-[200px] flex flex-col transition-colors enabled:hover:border-primary enabled:hover:bg-primary/5 enabled:active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="text-2xl font-bold">{title}</div>
      </div>
      <div className="mt-auto text-sm text-muted-foreground uppercase tracking-widest">
        {disabled ? "Coming soon" : "Open"}
      </div>
    </button>
  );
}

function MyFolderCard({ onClick }: { onClick: () => void }) {
  const { driver } = useCurrentDriver();
  const { data: docs = [] } = useEmployeeDocuments(driver?.id);
  const { data: acks = [] } = useDocumentAcks(driver?.id);
  const ackedSet = new Set(acks.map((a) => a.document_id));
  const pending = docs.filter((d) => d.requires_acknowledgment && !ackedSet.has(d.id)).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-left rounded-2xl border-2 border-border bg-card p-8 min-h-[200px] flex flex-col transition-colors hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
    >
      {pending > 0 && (
        <Badge className="absolute top-4 right-4 bg-amber-500 text-amber-950 hover:bg-amber-500 text-sm px-2.5 py-1">
          {pending} to review
        </Badge>
      )}
      <div className="flex items-center gap-4 mb-3">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Folder className="h-7 w-7 text-primary" />
        </div>
        <div className="text-2xl font-bold">My Folder</div>
      </div>
      <div className="mt-auto text-sm text-muted-foreground uppercase tracking-widest">
        {pending > 0 ? "Action needed" : "Open"}
      </div>
    </button>
  );
}
