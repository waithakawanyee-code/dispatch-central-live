import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Plus, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentDriver } from "@/hooks/useCurrentDriver";
import { updateMyProfile } from "@/hooks/useProfileChangeRequests";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DriverRow {
  id: string;
  name: string;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_name_2: string | null;
  emergency_contact_phone_2: string | null;
  emergency_contact_relationship_2: string | null;
  license_number: string | null;
  license_expiration: string | null;
  med_card_expiration: string | null;
}

const EDITABLE_FIELDS = [
  "name",
  "date_of_birth",
  "address",
  "phone",
  "email",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "emergency_contact_name_2",
  "emergency_contact_phone_2",
  "emergency_contact_relationship_2",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

function emptyForm(): Record<EditableField, string> {
  return Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, ""])) as Record<EditableField, string>;
}

function expirationState(date: string | null): "ok" | "soon" | "expired" {
  if (!date) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  if (d < today) return "expired";
  const days = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
  return days <= 30 ? "soon" : "ok";
}

export function PortalProfileTab() {
  const { driver: meta, loading: metaLoading } = useCurrentDriver();
  const { toast } = useToast();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<EditableField, string>>(emptyForm());
  const [showContact2, setShowContact2] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!meta?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("drivers")
      .select(
        "id, name, date_of_birth, address, phone, email, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, emergency_contact_name_2, emergency_contact_phone_2, emergency_contact_relationship_2, license_number, license_expiration, med_card_expiration",
      )
      .eq("id", meta.id)
      .maybeSingle();
    const row = data as DriverRow | null;
    setDriver(row);
    if (row) {
      setForm({
        name: row.name ?? "",
        date_of_birth: row.date_of_birth ?? "",
        address: row.address ?? "",
        phone: row.phone ?? "",
        email: row.email ?? "",
        emergency_contact_name: row.emergency_contact_name ?? "",
        emergency_contact_phone: row.emergency_contact_phone ?? "",
        emergency_contact_relationship: row.emergency_contact_relationship ?? "",
        emergency_contact_name_2: row.emergency_contact_name_2 ?? "",
        emergency_contact_phone_2: row.emergency_contact_phone_2 ?? "",
        emergency_contact_relationship_2: row.emergency_contact_relationship_2 ?? "",
      });
      setShowContact2(Boolean(row.emergency_contact_name_2 || row.emergency_contact_phone_2));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.id]);

  const dirty = useMemo(() => {
    if (!driver) return false;
    return EDITABLE_FIELDS.some((k) => {
      const a = (form[k] ?? "").trim();
      const b = ((driver as any)[k] ?? "") as string;
      return a !== (b ?? "");
    });
  }, [form, driver]);

  const canSave =
    dirty &&
    form.name.trim().length > 0 &&
    form.emergency_contact_name.trim().length > 0 &&
    form.emergency_contact_phone.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || !driver) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const k of EDITABLE_FIELDS) {
      const cur = ((driver as any)[k] ?? "") as string;
      const next = form[k].trim();
      // If clearing contact 2 fields, send empty string (RPC treats '' as clear)
      if (next !== (cur ?? "")) payload[k] = next;
    }
    try {
      await updateMyProfile(payload);
      toast({ title: "Profile updated", description: "Your dispatcher has been notified." });
      await load();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeContact2 = () => {
    setForm((f) => ({
      ...f,
      emergency_contact_name_2: "",
      emergency_contact_phone_2: "",
      emergency_contact_relationship_2: "",
    }));
    setShowContact2(false);
  };

  if (metaLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!driver) {
    return <div className="text-center text-muted-foreground py-12">Driver profile not found.</div>;
  }

  const licState = expirationState(driver.license_expiration);
  const medState = expirationState(driver.med_card_expiration);

  return (
    <div className="space-y-6">
      {/* Group 1 — Editable */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">My Information</h3>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="min-w-[140px]"
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-12 text-base"
            />
          </Field>
          <Field label="Date of Birth">
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="h-12 text-base"
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="555-555-5555"
              className="h-12 text-base"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-12 text-base"
            />
          </Field>
        </div>
        <Field label="Address">
          <Textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            rows={2}
            className="text-base"
          />
        </Field>

        {/* Emergency Contact 1 */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="text-sm font-semibold">
            Emergency Contact <span className="text-muted-foreground font-normal">(required)</span>
          </div>
          <Field label="Name" required>
            <Input
              value={form.emergency_contact_name}
              onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
              className="h-12 text-base"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Phone" required>
              <Input
                value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                className="h-12 text-base"
              />
            </Field>
            <Field label="Relationship">
              <Input
                value={form.emergency_contact_relationship}
                onChange={(e) =>
                  setForm({ ...form, emergency_contact_relationship: e.target.value })
                }
                placeholder="e.g. Spouse"
                className="h-12 text-base"
              />
            </Field>
          </div>
        </div>

        {/* Emergency Contact 2 */}
        {showContact2 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Second Emergency Contact</div>
              <button
                type="button"
                onClick={removeContact2}
                className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
            <Field label="Name">
              <Input
                value={form.emergency_contact_name_2}
                onChange={(e) => setForm({ ...form, emergency_contact_name_2: e.target.value })}
                className="h-12 text-base"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={form.emergency_contact_phone_2}
                  onChange={(e) =>
                    setForm({ ...form, emergency_contact_phone_2: e.target.value })
                  }
                  className="h-12 text-base"
                />
              </Field>
              <Field label="Relationship">
                <Input
                  value={form.emergency_contact_relationship_2}
                  onChange={(e) =>
                    setForm({ ...form, emergency_contact_relationship_2: e.target.value })
                  }
                  className="h-12 text-base"
                />
              </Field>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowContact2(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add another emergency contact
          </Button>
        )}
      </div>

      {/* Group 2 — Read-only compliance */}
      <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-xl font-bold">Compliance</h3>
          <Badge variant="outline" className="text-xs">managed by dispatch</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          To update these, upload a new document under <strong>My Documents</strong>. Dispatch will
          confirm before they change.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField label="Driver's License #" value={driver.license_number} />
          <ReadOnlyField
            label="License Expiration"
            value={driver.license_expiration}
            chip={
              licState === "expired"
                ? { label: "Expired", tone: "destructive" }
                : licState === "soon"
                  ? { label: "Expiring soon", tone: "warning" }
                  : null
            }
          />
          <ReadOnlyField
            label="DOT Medical Card Expiration"
            value={driver.med_card_expiration}
            chip={
              medState === "expired"
                ? { label: "Expired", tone: "destructive" }
                : medState === "soon"
                  ? { label: "Expiring soon", tone: "warning" }
                  : null
            }
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  chip,
}: {
  label: string;
  value: string | null;
  chip?: { label: string; tone: "warning" | "destructive" } | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-mono tabular-nums">{value ?? "—"}</div>
        {chip && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
              chip.tone === "destructive"
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-amber-500/10 text-amber-500 border-amber-500/30",
            )}
          >
            {chip.tone === "destructive" ? (
              <ShieldAlert className="h-3 w-3" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
            {chip.label}
          </span>
        )}
      </div>
    </div>
  );
}
