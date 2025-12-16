import { User, Phone } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

interface DriverRowProps {
  driver: DriverRow;
  onStatusChange?: (newStatus: DriverStatus) => void;
  canEdit?: boolean;
  isUpdated?: boolean;
  compact?: boolean;
}

const statusOptions: { value: DriverStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "on-route", label: "On Route" },
  { value: "break", label: "Break" },
  { value: "offline", label: "Offline" },
];

export function DriverRow({ driver, onStatusChange, canEdit = true, isUpdated = false, compact = false }: DriverRowProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-xs transition-all duration-200",
          "hover:border-primary/30",
          driver.status === "available" && "border-l-2 border-l-status-available",
          driver.status === "on-route" && "border-l-2 border-l-status-on-route",
          driver.status === "break" && "border-l-2 border-l-status-break",
          driver.status === "offline" && "border-l-2 border-l-status-offline opacity-60",
          driver.status === "off" && "border-l-2 border-l-status-offline opacity-60",
          driver.status === "scheduled" && "border-l-2 border-l-status-break",
          driver.status === "assigned" && "border-l-2 border-l-status-on-route",
          driver.status === "working" && "border-l-2 border-l-status-available",
          isUpdated && "animate-row-flash"
        )}
      >
        <span className="font-mono font-semibold text-foreground">{driver.name}</span>
        {driver.vehicle && (
          <span className="font-mono text-muted-foreground">{driver.vehicle}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200",
        "hover:border-primary/30",
        driver.status === "available" && "border-l-4 border-l-status-available",
        driver.status === "on-route" && "border-l-4 border-l-status-on-route",
        driver.status === "break" && "border-l-4 border-l-status-break",
        driver.status === "offline" && "border-l-4 border-l-status-offline opacity-60",
        isUpdated && "animate-row-flash"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="min-w-[120px] flex-1">
        <p className="text-sm font-medium text-foreground">{driver.name}</p>
        {driver.vehicle && (
          <p className="font-mono text-[10px] text-primary">{driver.vehicle}</p>
        )}
      </div>

      {driver.phone && (
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Phone className="h-3 w-3" />
          <span className="font-mono">{driver.phone}</span>
        </div>
      )}

      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer focus:outline-none">
              <StatusBadge status={driver.status} showPulse={driver.status !== "offline"} size="sm" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange?.(option.value)}
                className={cn(
                  "cursor-pointer text-xs",
                  driver.status === option.value && "bg-secondary"
                )}
              >
                <StatusBadge status={option.value} size="sm" />
                <span className="ml-2">{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <StatusBadge status={driver.status} showPulse={driver.status !== "offline"} size="sm" />
      )}
    </div>
  );
}
