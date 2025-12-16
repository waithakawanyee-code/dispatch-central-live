import { cn } from "@/lib/utils";

type DriverStatus = "available" | "on-route" | "break" | "offline" | "off" | "scheduled" | "assigned" | "working";
type VehicleStatus = "active" | "out-of-service";
type CleanStatus = "clean" | "dirty";

interface StatusBadgeProps {
  status: DriverStatus | VehicleStatus | CleanStatus;
  label?: string;
  showPulse?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  available: {
    bg: "bg-status-available/20",
    text: "text-status-available",
    border: "border-status-available/50",
    glow: "status-glow-available",
  },
  "on-route": {
    bg: "bg-status-on-route/20",
    text: "text-status-on-route",
    border: "border-status-on-route/50",
    glow: "status-glow-on-route",
  },
  break: {
    bg: "bg-status-break/20",
    text: "text-status-break",
    border: "border-status-break/50",
    glow: "status-glow-break",
  },
  offline: {
    bg: "bg-status-offline/20",
    text: "text-status-offline",
    border: "border-status-offline/50",
    glow: "status-glow-offline",
  },
  off: {
    bg: "bg-status-offline/20",
    text: "text-status-offline",
    border: "border-status-offline/50",
    glow: "status-glow-offline",
  },
  scheduled: {
    bg: "bg-status-available/20",
    text: "text-status-available",
    border: "border-status-available/50",
    glow: "status-glow-available",
  },
  assigned: {
    bg: "bg-blue-500/20",
    text: "text-blue-500",
    border: "border-blue-500/50",
    glow: "status-glow-on-route",
  },
  working: {
    bg: "bg-status-on-route/20",
    text: "text-status-on-route",
    border: "border-status-on-route/50",
    glow: "status-glow-on-route",
  },
  active: {
    bg: "bg-status-active/20",
    text: "text-status-active",
    border: "border-status-active/50",
    glow: "status-glow-active",
  },
  "out-of-service": {
    bg: "bg-status-out-of-service/20",
    text: "text-status-out-of-service",
    border: "border-status-out-of-service/50",
    glow: "status-glow-out-of-service",
  },
  clean: {
    bg: "bg-status-clean/20",
    text: "text-status-clean",
    border: "border-status-clean/50",
    glow: "status-glow-available",
  },
  dirty: {
    bg: "bg-status-dirty/20",
    text: "text-status-dirty",
    border: "border-status-dirty/50",
    glow: "status-glow-break",
  },
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

const statusLabels: Record<string, string> = {
  "on-route": "PUNCHED IN",
  "offline": "PUNCHED OUT",
  "scheduled": "NOT ASSIGNED",
  "assigned": "ASSIGNED",
};

export function StatusBadge({ status, label, showPulse = false, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || statusLabels[status] || status.replace("-", " ").toUpperCase();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded border font-mono font-medium uppercase tracking-wider",
        config.bg,
        config.text,
        config.border,
        showPulse && config.glow,
        sizeConfig[size]
      )}
    >
      {showPulse && (
        <span
          className={cn(
            "h-2 w-2 rounded-full animate-pulse-dot",
            status === "available" || status === "active" || status === "clean" || status === "scheduled"
              ? "bg-status-available"
              : status === "on-route" || status === "working"
              ? "bg-status-on-route"
              : status === "assigned"
              ? "bg-blue-500"
              : status === "break" || status === "dirty"
              ? "bg-status-break"
              : status === "out-of-service"
              ? "bg-status-out-of-service"
              : "bg-status-offline"
          )}
        />
      )}
      {displayLabel}
    </div>
  );
}
