import { ArrowRight } from "lucide-react";

interface ApprovalDiffProps {
  current: Record<string, any>;
  proposed: Record<string, any>;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  date_of_birth: "Date of Birth",
  address: "Address",
  phone: "Phone",
  email: "Email",
  license_number: "License #",
  license_expiration: "License Expiration",
  med_card_expiration: "Med Card Expiration",
  emergency_contact_name: "Emergency Contact",
  emergency_contact_phone: "Emergency Phone",
  emergency_contact_relationship: "Emergency Relationship",
  emergency_contact_name_2: "Emergency Contact 2",
  emergency_contact_phone_2: "Emergency Phone 2",
  emergency_contact_relationship_2: "Emergency Relationship 2",
};

export function ApprovalDiff({ current, proposed }: ApprovalDiffProps) {
  const keys = Object.keys(proposed).filter((k) => k !== "" && proposed[k] !== undefined);
  if (keys.length === 0) {
    return <div className="text-sm text-muted-foreground italic">No fields to update.</div>;
  }
  return (
    <div className="space-y-1.5">
      {keys.map((k) => {
        const label = FIELD_LABELS[k] ?? k;
        const oldV = current?.[k] ?? null;
        const newV = proposed[k];
        const changed = String(oldV ?? "") !== String(newV ?? "");
        return (
          <div
            key={k}
            className="grid grid-cols-[180px_1fr] gap-3 items-start text-sm py-1.5 border-b border-border/40 last:border-b-0"
          >
            <div className="text-muted-foreground font-medium">{label}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={
                  changed
                    ? "line-through text-muted-foreground/60"
                    : "text-muted-foreground"
                }
              >
                {oldV ? String(oldV) : "—"}
              </span>
              {changed && (
                <>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-bold font-mono tabular-nums">
                    {newV ? String(newV) : "—"}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
