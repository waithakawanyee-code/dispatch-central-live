import { useState } from "react";
import { Loader2, Copy, Printer, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  driverCode: string | null;
  onSaved: () => void;
}

function randomPin() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

export function SetPinDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
  driverCode,
  onSaved,
}: SetPinDialogProps) {
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);

  const reset = () => {
    setPin("");
    setRevealedPin(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("driver-portal-provision", {
      body: { driver_id: driverId, new_pin: pin },
    });
    setSaving(false);
    if (error || !(data as { success?: boolean })?.success) {
      const msg =
        (data as { error?: string })?.error || error?.message || "Failed to set PIN";
      toast.error(msg);
      return;
    }
    setRevealedPin(pin);
    onSaved();
  };

  const handlePrint = () => {
    if (!revealedPin) return;
    const w = window.open("", "_blank", "width=600,height=400");
    if (!w) return;
    w.document.write(`
      <html><head><title>Driver PIN</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 48px; }
        .card { border: 2px solid #111; border-radius: 12px; padding: 32px; max-width: 480px; }
        h1 { margin: 0 0 8px; font-size: 20px; }
        .muted { color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
        .row { margin-top: 20px; }
        .big { font-family: monospace; font-size: 56px; letter-spacing: 8px; font-weight: bold; }
      </style></head><body>
      <div class="card">
        <div class="muted">Above All Transportation — Driver Portal</div>
        <h1>${driverName}</h1>
        <div class="row"><div class="muted">Initials</div><div class="big">${driverCode ?? ""}</div></div>
        <div class="row"><div class="muted">PIN</div><div class="big">${revealedPin}</div></div>
        <div class="row muted" style="margin-top:32px">Keep this private. Sign in at the driver tablet.</div>
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{revealedPin ? "PIN Set" : "Set / Reset PIN"}</DialogTitle>
          <DialogDescription>
            {revealedPin
              ? "Show this PIN to the driver now. It will not be displayed again."
              : `Set a 4-digit PIN for ${driverName} (${driverCode ?? "—"}).`}
          </DialogDescription>
        </DialogHeader>

        {!revealedPin ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="font-mono text-2xl tracking-widest text-center h-14"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              type="button"
              className="w-full gap-2"
              onClick={() => setPin(randomPin())}
            >
              <Shuffle className="h-4 w-4" /> Generate Random PIN
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-6 my-2 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              One-time reveal
            </div>
            <div className="font-mono text-5xl font-bold tracking-[0.5em] mb-4">
              {revealedPin}
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(revealedPin);
                  toast.success("PIN copied");
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Print PIN Card
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!revealedPin ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || pin.length !== 4}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save PIN"}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
