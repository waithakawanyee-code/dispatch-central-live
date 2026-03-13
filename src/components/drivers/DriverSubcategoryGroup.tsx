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
    color: "text-blue-400/80",
    bgColor: "bg-blue-500/8 border border-blue-500/15",
  },
  dispatched: {
    label: "Dispatched",
    icon: Truck,
    color: "text-emerald-400/80",
    bgColor: "bg-emerald-500/8 border border-emerald-500/15",
  },
  report_time: {
    label: "Report Time",
    icon: Clock,
    color: "text-amber-400/80",
    bgColor: "bg-amber-500/8 border border-amber-500/15",
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    color: "text-purple-400/80",
    bgColor: "bg-purple-500/8 border border-purple-500/15",
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
      <div className="flex items-center gap-2 px-0.5">
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide uppercase", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
          <span className={config.color}>{config.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 font-mono">{count}</span>
      </div>

      {/* Drivers grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {children}
      </div>
    </div>
  );
}
