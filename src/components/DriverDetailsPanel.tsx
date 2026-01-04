import { X, Phone, Truck, Clock, Award, Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverRowType = Database["public"]["Tables"]["drivers"]["Row"];

interface DriverDetailsPanelProps {
  driver: DriverRowType | null;
  onClose: () => void;
}

export function DriverDetailsPanel({ driver, onClose }: DriverDetailsPanelProps) {
  if (!driver) return null;

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="fixed right-4 top-20 z-50 w-80 rounded-lg border border-border bg-card shadow-xl animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2.5 w-2.5 rounded-full",
            driver.status === "scheduled" && "bg-amber-500",
            driver.status === "unassigned" && "bg-slate-500",
            driver.status === "assigned" && "bg-emerald-500",
            ["working", "on-route"].includes(driver.status) && "bg-status-available",
            ["offline", "punched-out"].includes(driver.status) && "bg-status-offline",
            driver.status === "off" && "bg-red-500"
          )} />
          <h3 className="font-semibold text-foreground">{driver.name}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick Info */}
        <div className="flex items-center gap-3 flex-wrap">
          {driver.code && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded font-mono">
              <User className="h-3 w-3" />
              {driver.code}
            </span>
          )}
          {driver.has_cdl && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded font-semibold">
              <Award className="h-3 w-3" />
              CDL
            </span>
          )}
          {(driver as any).default_vehicle && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              <Home className="h-3 w-3" />
              {(driver as any).default_vehicle}
            </span>
          )}
        </div>

        {/* Contact Phone */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</h4>
          {driver.phone ? (
            <a 
              href={`tel:${driver.phone}`}
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{driver.phone}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>No phone</span>
            </div>
          )}
        </div>

        {/* Current Assignment */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignment</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {driver.vehicle || <span className="text-muted-foreground">No vehicle</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-mono">
                {driver.report_time ? formatTime(driver.report_time) : <span className="text-muted-foreground">No report time</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">V</kbd> to close
      </div>
    </div>
  );
}
