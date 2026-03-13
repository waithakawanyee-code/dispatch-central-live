import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function WidgetCard({ title, children, className }: WidgetCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/50 bg-card/60 overflow-hidden",
        className
      )}
    >
      {/* Widget Header */}
      <div className="border-b border-border/40 bg-muted/20 px-4 py-2.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
      </div>
      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-hidden">{children}</div>
    </div>
  );
}
