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
        "flex flex-col rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      {/* Widget Header - Airport board style */}
      <div className="border-b border-border/50 bg-muted/30 px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
      </div>
      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-hidden">{children}</div>
    </div>
  );
}
