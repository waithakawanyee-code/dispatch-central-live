import { UserPlus, Clock, LogOut, Power, Undo2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DriverActionToolbarProps {
  driverName: string;
  status: DriverStatus;
  onAssign: () => void;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onMarkOff: () => void;
  onUnassign: () => void;
  onReset: () => void;
  onResetAll?: () => void;
  showTestingTools?: boolean;
  className?: string;
}

interface ActionButton {
  label: string;
  shortcut: string;
  icon: typeof UserPlus;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function DriverActionToolbar({
  driverName,
  status,
  onAssign,
  onPunchIn,
  onPunchOut,
  onMarkOff,
  onUnassign,
  onReset,
  onResetAll,
  showTestingTools = false,
  className,
}: DriverActionToolbarProps) {
  // Determine which actions to show based on status
  const getActions = (): ActionButton[] => {
    switch (status) {
      case "unassigned":
      case "scheduled":
        return [
          { label: "Assign", shortcut: "A", icon: UserPlus, onClick: onAssign, variant: "default" },
          { label: "Mark OFF", shortcut: "O", icon: Power, onClick: onMarkOff, variant: "outline" },
        ];
      case "assigned":
        return [
          { label: "Punch In", shortcut: "P", icon: Clock, onClick: onPunchIn, variant: "default" },
          { label: "Mark OFF", shortcut: "O", icon: Power, onClick: onMarkOff, variant: "outline" },
          { label: "Unassign", shortcut: "", icon: Undo2, onClick: onUnassign, variant: "outline" },
        ];
      case "working":
      case "on-route":
        return [
          { label: "Punch Out", shortcut: "D", icon: LogOut, onClick: onPunchOut, variant: "default" },
        ];
      case "punched-out":
      case "offline":
        return [
          { label: "Reset", shortcut: "", icon: Undo2, onClick: onReset, variant: "outline" },
        ];
      case "off":
        return [
          { label: "Assign", shortcut: "A", icon: UserPlus, onClick: onAssign, variant: "default" },
          { label: "Reset", shortcut: "", icon: Undo2, onClick: onReset, variant: "outline" },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg",
        className
      )}
    >
      <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">
        {driverName}:
      </span>
      
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant as any}
          size="sm"
          onClick={action.onClick}
          className="h-7 gap-1.5 text-xs"
        >
          <action.icon className="h-3.5 w-3.5" />
          <span>{action.label}</span>
          {action.shortcut && (
            <kbd className="ml-1 px-1 py-0.5 rounded bg-background/50 text-[10px] font-mono text-muted-foreground border border-border/50">
              {action.shortcut}
            </kbd>
          )}
        </Button>
      ))}

      {/* Testing Tools Separator */}
      {showTestingTools && (
        <>
          <div className="h-5 w-px bg-border mx-1" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Test:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 gap-1 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
            title="Reset selected driver to unassigned"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
          {onResetAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              className="h-7 gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
              title="Reset ALL drivers to unassigned"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
