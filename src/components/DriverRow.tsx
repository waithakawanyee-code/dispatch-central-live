import { User, Phone, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DriverStatus = "available" | "on-route" | "break" | "offline";

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  currentLocation?: string;
  shiftStart?: string;
  shiftEnd?: string;
  vehicleId?: string;
}

interface DriverRowProps {
  driver: Driver;
  onStatusChange?: (newStatus: DriverStatus) => void;
}

const statusOptions: { value: DriverStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "on-route", label: "On Route" },
  { value: "break", label: "Break" },
  { value: "offline", label: "Offline" },
];

export function DriverRow({ driver, onStatusChange }: DriverRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-200",
        "hover:border-primary/30",
        driver.status === "available" && "border-l-4 border-l-status-available",
        driver.status === "on-route" && "border-l-4 border-l-status-on-route",
        driver.status === "break" && "border-l-4 border-l-status-break",
        driver.status === "offline" && "border-l-4 border-l-status-offline opacity-60"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="min-w-[120px] flex-1">
        <p className="text-sm font-medium text-foreground">{driver.name}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{driver.id}</p>
      </div>

      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <Phone className="h-3 w-3" />
        <span className="font-mono">{driver.phone}</span>
      </div>

      {driver.shiftStart && driver.shiftEnd && (
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{driver.shiftStart}-{driver.shiftEnd}</span>
        </div>
      )}

      {driver.vehicleId && (
        <span className="hidden rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-primary md:inline">
          {driver.vehicleId}
        </span>
      )}

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
    </div>
  );
}
