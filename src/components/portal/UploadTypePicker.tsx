import { IdCard, HeartPulse, FileText } from "lucide-react";

interface UploadTypePickerProps {
  onPick: (type: "license" | "medical" | "other") => void;
}

export function UploadTypePicker({ onPick }: UploadTypePickerProps) {
  const options = [
    {
      id: "license" as const,
      icon: IdCard,
      title: "Driver's License",
      desc: "Submit a new license. Dispatch must confirm the new expiration date.",
    },
    {
      id: "medical" as const,
      icon: HeartPulse,
      title: "DOT Medical Card",
      desc: "Submit a new med card. Dispatch must confirm the new expiration date.",
    },
    {
      id: "other" as const,
      icon: FileText,
      title: "Other",
      desc: "Any other document. Filed in your folder.",
    },
  ];
  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className="text-left rounded-xl border-2 border-border bg-card p-5 flex items-start gap-4 hover:border-primary hover:bg-primary/5 active:scale-[0.99] transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold mb-1">{o.title}</div>
              <div className="text-sm text-muted-foreground">{o.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
