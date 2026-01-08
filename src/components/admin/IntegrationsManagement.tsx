import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { RefreshCw, Send, AlertTriangle, CheckCircle2, XCircle, Clock, Truck, Droplets, Key } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { VehicleCombobox } from "@/components/VehicleCombobox";

interface WashEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  source: string;
  payload_json: Json | null;
  idempotency_key: string | null;
  vehicle_id: string;
  vehicles?: { unit: string } | null;
}

interface TestResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface Vehicle {
  id: string;
  unit: string;
  vehicle_type: string | null;
}

export function IntegrationsManagement() {
  const [lastWash, setLastWash] = useState<WashEvent | null>(null);
  const [recentEvents, setRecentEvents] = useState<WashEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedTestVehicle, setSelectedTestVehicle] = useState("Car-12");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch last wash event
      const { data: lastWashData } = await supabase
        .from("vehicle_status_events")
        .select("*, vehicles(unit)")
        .eq("event_type", "WASH_RECORDED")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastWash(lastWashData);

      // Fetch recent 20 events
      const { data: eventsData } = await supabase
        .from("vehicle_status_events")
        .select("*, vehicles(unit)")
        .order("occurred_at", { ascending: false })
        .limit(20);

      setRecentEvents(eventsData || []);

      // Fetch active vehicles for dropdown
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("id, unit, vehicle_type")
        .eq("status", "active")
        .order("unit");

      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error("Error fetching integration data:", error);
      toast.error("Failed to fetch integration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestWebhook = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("wash-events", {
        body: {
          vehicle_identifier: selectedTestVehicle,
          raw_source: `admin_test_${new Date().toISOString()}`,
        },
      });

      if (error) throw error;

      setTestResult({ success: true, data });
      toast.success("Test webhook sent successfully");

      // Refresh data after test
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setTestResult({ success: false, error: errorMessage });
      toast.error("Test webhook failed");
    } finally {
      setTestLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy h:mm:ss a");
    } catch {
      return timestamp;
    }
  };

  const getPayloadValue = (payload: Json | null, key: string): string => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "—";
    const value = (payload as Record<string, unknown>)[key];
    if (value === undefined || value === null) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            Monitor vehicle wash webhook integration and clean-status automation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Section 1: Wash Events Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Wash Received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {lastWash ? formatTimestamp(lastWash.occurred_at) : "No washes recorded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Last Washed Vehicle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{lastWash?.vehicles?.unit || "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{getPayloadValue(lastWash?.payload_json || null, "raw_source")}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Status Updated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastWash?.payload_json &&
            typeof lastWash.payload_json === "object" &&
            !Array.isArray(lastWash.payload_json) ? (
              ((payload) =>
                (payload as Record<string, unknown>).status_updated === true ? (
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Yes</Badge>
                ) : (payload as Record<string, unknown>).status_updated === false ? (
                  <Badge variant="secondary">No</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ))(lastWash.payload_json)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Last Webhook Payload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last Webhook Payload</CardTitle>
          <CardDescription>Most recent wash event details</CardDescription>
        </CardHeader>
        <CardContent>
          {lastWash ? (
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Vehicle Unit:</span> {lastWash.vehicles?.unit || "Unknown"}
              </div>
              <div>
                <span className="text-muted-foreground">Washed At:</span> {formatTimestamp(lastWash.occurred_at)}
              </div>
              <div>
                <span className="text-muted-foreground">Raw Source:</span>{" "}
                {getPayloadValue(lastWash.payload_json, "raw_source")}
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">Idempotency Key:</span>
                <span className="break-all">{lastWash.idempotency_key || "—"}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No wash events recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Recent Vehicle Status Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Vehicle Status Events</CardTitle>
          <CardDescription>Last 20 events across all types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>New Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No events recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  recentEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatTimestamp(event.occurred_at)}</TableCell>
                      <TableCell className="font-medium">{event.vehicles?.unit || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={event.event_type === "WASH_RECORDED" ? "default" : "secondary"}
                          className={
                            event.event_type === "WASH_RECORDED"
                              ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
                              : ""
                          }
                        >
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{event.source}</TableCell>
                      <TableCell>{getPayloadValue(event.payload_json, "new_status")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {getPayloadValue(event.payload_json, "reason")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Test Webhook Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Test Webhook Tool
          </CardTitle>
          <CardDescription>Send a test wash event to verify the integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant="destructive"
            className="bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Admin Testing Only</AlertTitle>
            <AlertDescription>
              This will create a real wash event with source "admin_test"
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <div className="w-48">
              <VehicleCombobox
                vehicles={vehicles}
                value={selectedTestVehicle}
                onValueChange={setSelectedTestVehicle}
                placeholder="Select vehicle"
                includeNone={false}
              />
            </div>
            <Button onClick={handleTestWebhook} disabled={testLoading || !selectedTestVehicle}>
              {testLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Test Wash Event
            </Button>
          </div>

          {testResult && (
            <div
              className={`rounded-lg p-4 ${testResult.success ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={`font-medium ${testResult.success ? "text-green-600" : "text-destructive"}`}>
                  {testResult.success ? "Success" : "Error"}
                </span>
              </div>
              <pre className="text-sm font-mono bg-background/50 rounded p-2 overflow-auto">
                {JSON.stringify(testResult.success ? testResult.data : { error: testResult.error }, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
