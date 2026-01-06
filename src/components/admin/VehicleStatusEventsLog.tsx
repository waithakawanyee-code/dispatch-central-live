import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Droplets, RefreshCw, Search, Filter, Sparkles, Clock, Wrench, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatchData } from "@/hooks/useDispatchData";

interface VehicleStatusEvent {
  id: string;
  vehicle_id: string;
  event_type: string;
  occurred_at: string;
  source: string;
  payload_json: unknown;
  created_at: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Droplets; color: string }> = {
  WASH_RECORDED: { label: "Wash Recorded", icon: Droplets, color: "text-cyan-500" },
  CLEAN_STATUS_MARKED_CLEAN: { label: "Marked Clean", icon: Sparkles, color: "text-green-500" },
  CLEAN_STATUS_MARKED_DIRTY: { label: "Marked Dirty", icon: Wrench, color: "text-orange-500" },
  CLEAN_STATUS_TIMEOUT_24H: { label: "24hr Timeout", icon: Clock, color: "text-amber-500" },
  CLEAN_STATUS_PUNCH_OUT: { label: "Punch Out", icon: Zap, color: "text-red-500" },
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  automation: "Automation",
  integration: "Integration",
};

export function VehicleStatusEventsLog() {
  const { vehicles } = useDispatchData();
  const [events, setEvents] = useState<VehicleStatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterVehicle, setFilterVehicle] = useState<string>("all");

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicle_status_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Create a map of vehicle IDs to units
  const vehicleMap = new Map(vehicles.map(v => [v.id, v.unit]));

  // Filter events
  const filteredEvents = events.filter(event => {
    const vehicleUnit = vehicleMap.get(event.vehicle_id) || "";
    
    if (filterEventType !== "all" && event.event_type !== filterEventType) return false;
    if (filterSource !== "all" && event.source !== filterSource) return false;
    if (filterVehicle !== "all" && event.vehicle_id !== filterVehicle) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchUnit = vehicleUnit.toLowerCase().includes(q);
      const matchType = event.event_type.toLowerCase().includes(q);
      const matchSource = event.source.toLowerCase().includes(q);
      if (!matchUnit && !matchType && !matchSource) return false;
    }
    
    return true;
  });

  const getEventConfig = (eventType: string) => {
    return EVENT_TYPE_CONFIG[eventType] || { 
      label: eventType.replace(/_/g, " "), 
      icon: Wrench, 
      color: "text-muted-foreground" 
    };
  };

  const formatPayload = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return null;
    
    const p = payload as Record<string, unknown>;
    const parts: string[] = [];
    if (p.previous_status && p.new_status) {
      parts.push(`${p.previous_status} → ${p.new_status}`);
    }
    if (p.reason) {
      parts.push(`Reason: ${p.reason}`);
    }
    if (p.raw_source) {
      parts.push(`Source: ${p.raw_source}`);
    }
    
    return parts.length > 0 ? parts.join(" | ") : null;
  };

  // Get unique event types from data
  const uniqueEventTypes = [...new Set(events.map(e => e.event_type))];
  const uniqueSources = [...new Set(events.map(e => e.source))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Vehicle Status Events
            </CardTitle>
            <CardDescription>
              Track wash events, clean status changes, and automation actions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterEventType} onValueChange={setFilterEventType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueEventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getEventConfig(type).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>
                  {SOURCE_LABELS[source] || source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Vehicle</TableHead>
                <TableHead className="w-[180px]">Event</TableHead>
                <TableHead className="w-[100px]">Source</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[160px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => {
                  const config = getEventConfig(event.event_type);
                  const Icon = config.icon;
                  const vehicleUnit = vehicleMap.get(event.vehicle_id) || "Unknown";
                  const payloadInfo = formatPayload(event.payload_json);
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{vehicleUnit}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABELS[event.source] || event.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payloadInfo ? (
                          <span className="text-xs text-muted-foreground">{payloadInfo}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.occurred_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && filteredEvents.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        )}
      </CardContent>
    </Card>
  );
}
