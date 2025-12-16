import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accentColor?: "primary" | "accent" | "destructive";
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "primary",
}: StatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentColor === "primary" && "bg-primary/20",
            accentColor === "accent" && "bg-accent/20",
            accentColor === "destructive" && "bg-destructive/20"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              accentColor === "primary" && "text-primary",
              accentColor === "accent" && "text-accent",
              accentColor === "destructive" && "text-destructive"
            )}
          />
        </div>
      </div>
      <p className="mt-2 font-mono text-3xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
