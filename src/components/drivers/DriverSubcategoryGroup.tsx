import { ReactNode } from "react";
import { Truck, Clock, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type SubcategoryType = "has_vehicle" | "dispatched" | "report_time" | "scheduled";

interface DriverSubcategoryGroupProps {
  type: SubcategoryType;
  count: number;
  children: ReactNode;
  className?: string;
}

const subcategoryConfig: Record<SubcategoryType, {
  label: string;
  icon: typeof Truck;
  color: string;
  bgColor: string;
}> = {
  has_vehicle: {
    label: "Has Vehicle",
    icon: Truck,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  dispatched: {
    label: "Dispatched",
    icon: Truck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  report_time: {
    label: "Report Time",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
};

export function DriverSubcategoryGroup({
  type,
  count,
  children,
  className,
}: DriverSubcategoryGroupProps) {
  const config = subcategoryConfig[type];
  const Icon = config.icon;

  if (count === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Subcategory header */}
      <div className="flex items-center gap-2 px-1">
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
          <span className={config.color}>{config.label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">({count})</span>
      </div>

      {/* Drivers - 3 column grid */}
      <div className="grid grid-cols-3 gap-1">
        {children}
      </div>
    </div>
  );
}
