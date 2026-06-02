import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnScreenKeyboard } from "@/components/tablet/OnScreenKeyboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LOGIN_TS_KEY = "driver-portal-login-ts";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TabletLogin() {
  const navigate = useNavigate();
  const now = useClock();
  const [initials, setInitials] = useState("");
  const [pin, setPin] = useState("");
  const [focus, setFocus] = useState<"initials" | "pin">("initials");
  const [submitting, setSubmitting] = useState(false);

  // Auto-advance to PIN when initials are complete
  useEffect(() => {
    if (initials.length === 4 && focus === "initials") setFocus("pin");
  }, [initials, focus]);

  const canSubmit = initials.length === 4 && pin.length === 4 && !submitting;

  const handleKey = (k: string) => {
    if (focus === "initials") {
      if (initials.length < 4) setInitials((s) => (s + k).toUpperCase());
    } else {
      if (pin.length < 4) setPin((s) => s + k);
    }
  };

  const handleBackspace = () => {
    if (focus === "initials") setInitials((s) => s.slice(0, -1));
    else setPin((s) => s.slice(0, -1));
  };

  const handleClear = () => {
    if (focus === "initials") setInitials("");
    else setPin("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("driver-tablet-login", {
        body: { initials, pin },
      });

      if (error || !data?.access_token) {
        const msg =
          (data && (data as { error?: string }).error) ||
          "Invalid credentials";
        toast.error(msg);
        setPin("");
        setFocus("pin");
        return;
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) {
        toast.error("Invalid credentials");
        return;
      }

      const firstName = (data.driver?.name as string | undefined)?.split(/\s+/)[0] ?? "";
      toast.success(`Welcome, ${firstName}`);
      localStorage.setItem(LOGIN_TS_KEY, Date.now().toString());
      navigate("/portal", { replace: true });
    } catch (_) {
      toast.error("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="px-8 pt-6 pb-4 grid grid-cols-3 items-center">
        <div />
        <div className="flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Radio className="h-6 w-6 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">Above All Transportation</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Driver Portal
            </div>
          </div>
        </div>
        <div className="text-right text-2xl font-mono tabular-nums text-muted-foreground">
          {timeStr}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-3xl">
          <h1 className="text-center text-3xl font-bold mb-2">Sign In</h1>
          <p className="text-center text-muted-foreground mb-8 text-base">
            Enter your initials and PIN
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <FieldDisplay
              label="Initials"
              value={initials}
              max={4}
              active={focus === "initials"}
              onClick={() => setFocus("initials")}
            />
            <FieldDisplay
              label="PIN"
              value={pin}
              max={4}
              masked
              active={focus === "pin"}
              onClick={() => setFocus("pin")}
            />
          </div>

          <div className="mb-8">
            <OnScreenKeyboard
              mode={focus === "initials" ? "alpha" : "numeric"}
              onKey={handleKey}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />
          </div>

          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full h-16 text-xl font-semibold rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground uppercase tracking-widest">
        Above All Transportation Driver Portal
      </footer>
    </div>
  );
}

function FieldDisplay({
  label,
  value,
  max,
  masked,
  active,
  onClick,
}: {
  label: string;
  value: string;
  max: number;
  masked?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const slots = Array.from({ length: max });
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border-2 px-5 py-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-muted-foreground/40",
      )}
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex gap-2 h-14 items-center">
        {slots.map((_, i) => {
          const filled = i < value.length;
          const ch = masked && filled ? "•" : value[i] ?? "";
          return (
            <div
              key={i}
              className={cn(
                "flex-1 min-w-12 h-full rounded-lg flex items-center justify-center text-3xl font-mono font-bold border",
                filled ? "border-foreground/30 bg-background" : "border-dashed border-muted-foreground/30",
              )}
            >
              {ch}
            </div>
          );
        })}
      </div>
    </button>
  );
}
