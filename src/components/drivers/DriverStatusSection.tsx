import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DriverStatusSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "muted";
  className?: string;
}

export function DriverStatusSection({
  title,
  subtitle,
  count,
  icon,
  children,
  variant = "default",
  className,
}: DriverStatusSectionProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          titleColor: "text-emerald-400",
          countBg: "bg-emerald-500/20 text-emerald-400",
        };
      case "warning":
        return {
          titleColor: "text-amber-400",
          countBg: "bg-amber-500/20 text-amber-400",
        };
      case "muted":
        return {
          titleColor: "text-muted-foreground",
          countBg: "bg-muted text-muted-foreground",
        };
      default:
        return {
          titleColor: "text-foreground",
          countBg: "bg-secondary text-secondary-foreground",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className={cn("shrink-0", styles.titleColor)}>
              {icon}
            </span>
          )}
          <h3 className={cn("text-sm font-semibold uppercase tracking-wider", styles.titleColor)}>
            {title}
          </h3>
          {subtitle && (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-xs font-medium", styles.countBg)}>
          {count}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}
