import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DisplaySectionProps {
  title: string;
  count: number;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "muted";
  children: ReactNode;
  className?: string;
}

export function DisplaySection({
  title,
  count,
  icon,
  children,
  variant = "default",
  className,
}: DisplaySectionProps) {
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
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className={cn("shrink-0", styles.titleColor)}>
              {icon}
            </span>
          )}
          <h3 className={cn("text-xs font-semibold uppercase tracking-wider", styles.titleColor)}>
            {title}
          </h3>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-xs font-medium", styles.countBg)}>
          {count}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
