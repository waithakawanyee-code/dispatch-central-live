import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVehicleServiceTickets, type ServiceTicket } from "@/hooks/useVehicleServiceTickets";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleTicketsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleUnit: string;
}

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-600 border-amber-500/30", icon: AlertTriangle },
  waiting_parts: { label: "Waiting Parts", color: "bg-purple-500/20 text-purple-600 border-purple-500/30", icon: Package },
  closed: { label: "Closed", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-500/20 text-slate-600" },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-600" },
  high: { label: "High", color: "bg-orange-500/20 text-orange-600" },
  critical: { label: "Critical", color: "bg-red-500/20 text-red-600" },
};

export function VehicleTicketsSheet({
  open,
  onOpenChange,
  vehicleId,
  vehicleUnit,
}: VehicleTicketsSheetProps) {
  const { toast } = useToast();
  const { getVehicleTickets, closeTicket, isClosing } = useVehicleServiceTickets();
  
  const tickets = getVehicleTickets(vehicleId);
  const openTickets = tickets.filter((t) => t.ticket_status !== "closed");
  const closedTickets = tickets.filter((t) => t.ticket_status === "closed");

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await closeTicket(ticketId);
      toast({
        title: "Success",
        description: "Ticket closed successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
    }
  };

  const renderTicket = (ticket: ServiceTicket) => {
    const statusConfig = STATUS_CONFIG[ticket.ticket_status];
    const priorityConfig = PRIORITY_CONFIG[ticket.priority];
    const StatusIcon = statusConfig.icon;

    return (
      <div
        key={ticket.id}
        className="rounded-lg border border-border bg-card p-3 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {ticket.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {ticket.description}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px] gap-1", statusConfig.color)}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[10px]", priorityConfig.color)}
          >
            {priorityConfig.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground capitalize">
            {ticket.category}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(ticket.created_at), "MMM d, yyyy")}
          </span>
        </div>

        {ticket.ticket_status !== "closed" && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleCloseTicket(ticket.id)}
              disabled={isClosing}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Close Ticket
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Service Tickets - {vehicleUnit}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-4 pr-4">
            {openTickets.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Open Tickets ({openTickets.length})
                </h3>
                <div className="space-y-2">
                  {openTickets.map(renderTicket)}
                </div>
              </div>
            )}

            {closedTickets.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Closed Tickets ({closedTickets.length})
                </h3>
                <div className="space-y-2 opacity-60">
                  {closedTickets.slice(0, 5).map(renderTicket)}
                </div>
                {closedTickets.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{closedTickets.length - 5} more closed tickets
                  </p>
                )}
              </div>
            )}

            {tickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No service tickets for this vehicle</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
