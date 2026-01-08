import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Clock, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";

type TicketStatus = "open" | "in_progress" | "waiting_parts" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";

interface ServiceTicket {
  id: string;
  title: string;
  description: string;
  ticket_status: TicketStatus;
  priority: TicketPriority;
  category: string;
  created_at: string;
  closed_at: string | null;
  vehicle_id: string;
  vehicles?: {
    unit: string;
  };
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: React.ElementType; className: string }> = {
  open: { label: "Open", icon: AlertCircle, className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  in_progress: { label: "In Progress", icon: Clock, className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  waiting_parts: { label: "Waiting Parts", icon: Package, className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  closed: { label: "Closed", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-slate-500/10 text-slate-600",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-orange-500/10 text-orange-600",
  critical: "bg-red-500/10 text-red-600",
};

export function ServiceTicketsManagement() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-service-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_service_tickets")
        .select(`
          *,
          vehicles (unit)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ServiceTicket[];
    },
  });

  const filteredTickets = statusFilter === "all" 
    ? tickets 
    : tickets.filter(t => t.ticket_status === statusFilter);

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.ticket_status === "open").length,
    in_progress: tickets.filter(t => t.ticket_status === "in_progress").length,
    waiting_parts: tickets.filter(t => t.ticket_status === "waiting_parts").length,
    closed: tickets.filter(t => t.ticket_status === "closed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Service Tickets</h2>
          <Badge variant="secondary" className="text-xs">
            {tickets.length} total
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {(["all", "open", "in_progress", "waiting_parts", "closed"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "All" : STATUS_CONFIG[status].label}
            <span className="opacity-60">({statusCounts[status]})</span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tickets found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => {
            const statusConfig = STATUS_CONFIG[ticket.ticket_status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card key={ticket.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{ticket.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {ticket.vehicles?.unit || "Unknown"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>Created {format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span className="capitalize">{ticket.category}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={`text-[10px] gap-1 ${statusConfig.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      <Badge className={`text-[10px] capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
