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
          countBg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        };
      case "warning":
        return {
          titleColor: "text-amber-400",
          countBg: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        };
      case "muted":
        return {
          titleColor: "text-muted-foreground",
          countBg: "bg-muted text-muted-foreground border border-border/50",
        };
      default:
        return {
          titleColor: "text-foreground",
          countBg: "bg-secondary/80 text-secondary-foreground border border-border/50",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className={cn("flex items-center justify-between pb-1.5 border-b border-border/40")}>
        <div className="flex items-center gap-2">
          {icon && (
            <span className={cn("shrink-0 opacity-70", styles.titleColor)}>
              {icon}
            </span>
          )}
          <h3 className={cn("text-[10px] font-semibold uppercase tracking-widest", styles.titleColor)}>
            {title}
          </h3>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-medium", styles.countBg)}>
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
