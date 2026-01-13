import { cn } from "@/lib/utils";

// New driver status model
type DriverStatus = "unconfirmed" | "confirmed" | "on_the_clock" | "done" | "off";
type VehicleStatus = "active" | "out-of-service" | "maintenance" | "returned";
type CleanStatus = "clean" | "dirty" | "unknown";

// Subcategory for unconfirmed drivers
export type UnconfirmedSubcategory = "has_vehicle" | "reporting_to_office";

interface StatusBadgeProps {
  status: DriverStatus | VehicleStatus | CleanStatus;
  label?: string;
  showPulse?: boolean;
  size?: "sm" | "md" | "lg";
  subcategory?: UnconfirmedSubcategory;
}

const statusConfig: Record<string, {
  bg: string;
  text: string;
  border: string;
  glow: string;
}> = {
  // New driver statuses
  unconfirmed: {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    border: "border-slate-500/50",
    glow: "status-glow-offline"
  },
  confirmed: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-500",
    border: "border-emerald-500/50",
    glow: "status-glow-available"
  },
  on_the_clock: {
    bg: "bg-status-available/20",
    text: "text-status-available",
    border: "border-status-available/50",
    glow: "status-glow-available"
  },
  done: {
    bg: "bg-status-offline/20",
    text: "text-status-offline",
    border: "border-status-offline/50",
    glow: "status-glow-offline"
  },
  off: {
    bg: "bg-red-500/20",
    text: "text-red-500",
    border: "border-red-500/50",
    glow: "status-glow-out-of-service"
  },
  // Subcategories for unconfirmed
  has_vehicle: {
    bg: "bg-blue-500/20",
    text: "text-blue-500",
    border: "border-blue-500/50",
    glow: "status-glow-on-route"
  },
  reporting_to_office: {
    bg: "bg-amber-500/20",
    text: "text-amber-500",
    border: "border-amber-500/50",
    glow: "status-glow-break"
  },
  // Vehicle statuses
  active: {
    bg: "bg-status-active/20",
    text: "text-status-active",
    border: "border-status-active/50",
    glow: "status-glow-active"
  },
  "out-of-service": {
    bg: "bg-status-out-of-service/20",
    text: "text-status-out-of-service",
    border: "border-status-out-of-service/50",
    glow: "status-glow-out-of-service"
  },
  maintenance: {
    bg: "bg-amber-500/20",
    text: "text-amber-500",
    border: "border-amber-500/50",
    glow: "status-glow-break"
  },
  returned: {
    bg: "bg-status-available/20",
    text: "text-status-available",
    border: "border-status-available/50",
    glow: "status-glow-available"
  },
  // Clean statuses
  clean: {
    bg: "bg-status-clean/20",
    text: "text-status-clean",
    border: "border-status-clean/50",
    glow: "status-glow-available"
  },
  dirty: {
    bg: "bg-status-dirty/20",
    text: "text-status-dirty",
    border: "border-status-dirty/50",
    glow: "status-glow-break"
  },
  unknown: {
    bg: "bg-muted/20",
    text: "text-muted-foreground",
    border: "border-muted-foreground/50",
    glow: "status-glow-offline"
  }
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base"
};

const statusLabels: Record<string, string> = {
  unconfirmed: "UNCONFIRMED",
  confirmed: "CONFIRMED",
  on_the_clock: "ON THE CLOCK",
  done: "DONE",
  off: "OFF",
  has_vehicle: "HAS VEHICLE",
  reporting_to_office: "REPORTING TO OFFICE",
};

export function StatusBadge({
  status,
  label,
  showPulse = false,
  size = "md",
  subcategory,
}: StatusBadgeProps) {
  // Use subcategory config if provided for unconfirmed status
  const configKey = status === "unconfirmed" && subcategory ? subcategory : status;
  const config = statusConfig[configKey];
  
  // Get display label
  let displayLabel = label;
  if (!displayLabel) {
    if (status === "unconfirmed" && subcategory) {
      displayLabel = statusLabels[subcategory];
    } else {
      displayLabel = statusLabels[status] || status.replace(/_/g, " ").toUpperCase();
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider",
        config?.bg,
        config?.text,
        config?.border,
        sizeConfig[size]
      )}
    >
      {showPulse && (
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config?.bg?.replace("/20", ""))} />
      )}
      {displayLabel}
    </span>
  );
}
