import { useState, useMemo } from "react";
import { 
  Ticket, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  AlertTriangle, 
  Package, 
  CheckCircle,
  Truck,
  X,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVehicleServiceTickets, type ServiceTicket } from "@/hooks/useVehicleServiceTickets";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { ServiceTicketDialog } from "@/components/ServiceTicketDialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type MaintenanceCategory = Database["public"]["Enums"]["maintenance_category"];
type MaintenancePriority = Database["public"]["Enums"]["maintenance_priority"];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-600 border-amber-500/30", icon: AlertTriangle },
  waiting_parts: { label: "Waiting Parts", color: "bg-purple-500/20 text-purple-600 border-purple-500/30", icon: Package },
  closed: { label: "Closed", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<MaintenancePriority, { label: string; color: string; sortOrder: number }> = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-600 border-red-500/30", sortOrder: 0 },
  high: { label: "High", color: "bg-orange-500/20 text-orange-600 border-orange-500/30", sortOrder: 1 },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", sortOrder: 2 },
  low: { label: "Low", color: "bg-slate-500/20 text-slate-600 border-slate-500/30", sortOrder: 3 },
};

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  tire: "Tire",
  body: "Body",
  cleaning: "Cleaning",
  other: "Other",
};

type SortOption = "created_desc" | "created_asc" | "priority_desc" | "priority_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "created_desc", label: "Newest First" },
  { value: "created_asc", label: "Oldest First" },
  { value: "priority_desc", label: "Priority (High → Low)" },
  { value: "priority_asc", label: "Priority (Low → High)" },
];

const ServiceTickets = () => {
  const { toast } = useToast();
  const { tickets, closeTicket, isClosing } = useVehicleServiceTickets();
  const { vehicles } = useDispatchData();
  const { isAdmin } = useUserRole();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");

  // New ticket dialog
  const [newTicketDialogOpen, setNewTicketDialogOpen] = useState(false);
  const [selectedVehicleForTicket, setSelectedVehicleForTicket] = useState<{ id: string; unit: string } | null>(null);

  // Get vehicle unit by ID
  const getVehicleUnit = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.unit || "Unknown";
  };

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          getVehicleUnit(t.vehicle_id).toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.ticket_status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Vehicle filter
    if (vehicleFilter !== "all") {
      result = result.filter((t) => t.vehicle_id === vehicleFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "priority_desc":
          return PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder;
        case "priority_asc":
          return PRIORITY_CONFIG[b.priority].sortOrder - PRIORITY_CONFIG[a.priority].sortOrder;
        default:
          return 0;
      }
    });

    return result;
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter, vehicleFilter, sortBy, vehicles]);

  // Stats
  const openTickets = tickets.filter((t) => t.ticket_status !== "closed");
  const criticalTickets = openTickets.filter((t) => t.priority === "critical");
  const inProgressTickets = tickets.filter((t) => t.ticket_status === "in_progress");

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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setVehicleFilter("all");
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || vehicleFilter !== "all";

  const openNewTicketDialog = (vehicleId: string, vehicleUnit: string) => {
    setSelectedVehicleForTicket({ id: vehicleId, unit: vehicleUnit });
    setNewTicketDialogOpen(true);
  };

  const renderTicketCard = (ticket: ServiceTicket) => {
    const statusConfig = STATUS_CONFIG[ticket.ticket_status];
    const priorityConfig = PRIORITY_CONFIG[ticket.priority];
    const StatusIcon = statusConfig.icon;
    const vehicleUnit = getVehicleUnit(ticket.vehicle_id);

    return (
      <div
        key={ticket.id}
        className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                <Truck className="h-3 w-3" />
                {vehicleUnit}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px] gap-1 shrink-0", statusConfig.color)}
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <h3 className="font-medium text-sm text-foreground truncate">{ticket.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-[10px]", priorityConfig.color)}
            >
              {priorityConfig.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">
              {CATEGORY_LABELS[ticket.category]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          {isAdmin && ticket.ticket_status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs shrink-0"
              onClick={() => handleCloseTicket(ticket.id)}
              disabled={isClosing}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Close
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Service Tickets
            </h1>
            <p className="text-sm text-muted-foreground">Fleet-wide service ticket management</p>
          </div>
          
          {isAdmin && vehicles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Ticket
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                {vehicles.map((v) => (
                  <DropdownMenuRadioItem
                    key={v.id}
                    value={v.id}
                    onClick={() => openNewTicketDialog(v.id, v.unit)}
                    className="cursor-pointer"
                  >
                    {v.unit}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Open Tickets</p>
            <p className="text-2xl font-bold text-foreground">{openTickets.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold text-red-600">{criticalTickets.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-amber-600">{inProgressTickets.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{tickets.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card/50 p-3 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as MaintenancePriority | "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(Object.keys(PRIORITY_CONFIG) as MaintenancePriority[]).map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_CONFIG[priority].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as MaintenanceCategory | "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as MaintenanceCategory[]).map((category) => (
                  <SelectItem key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Ticket List */}
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Tickets ({filteredTickets.length})
            </h2>
          </div>

          {filteredTickets.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredTickets.map(renderTicketCard)}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters ? "No tickets match your filters" : "No service tickets yet"}
              </p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Dialog */}
      {selectedVehicleForTicket && (
        <ServiceTicketDialog
          open={newTicketDialogOpen}
          onOpenChange={setNewTicketDialogOpen}
          vehicleId={selectedVehicleForTicket.id}
          vehicleUnit={selectedVehicleForTicket.unit}
        />
      )}
    </div>
  );
};

export default ServiceTickets;
