import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, Download, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimePunch {
  id: string;
  driver_id: string;
  driver_name: string;
  punch_type: string;
  punch_time: string;
  notes: string | null;
  created_at: string;
}

export function TimePunchReport() {
  const [punches, setPunches] = useState<TimePunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.toISOString().split("T")[0];
  });

  const fetchPunches = async () => {
    setLoading(true);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("time_punches")
      .select("*")
      .gte("punch_time", startDateTime.toISOString())
      .lte("punch_time", endDateTime.toISOString())
      .order("punch_time", { ascending: false });

    if (error) {
      console.error("Error fetching punches:", error);
    } else {
      setPunches(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPunches();
  }, [startDate, endDate]);

  const exportToCSV = () => {
    const headers = ["Driver Name", "Punch Type", "Punch Time", "Notes"];
    const rows = punches.map((p) => [
      p.driver_name,
      p.punch_type === "in" ? "Punch In" : "Punch Out",
      format(new Date(p.punch_time), "yyyy-MM-dd HH:mm:ss"),
      p.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-punches-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Time Punch Report
        </h3>
        <Button onClick={exportToCSV} variant="outline" size="sm" disabled={punches.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button onClick={fetchPunches} variant="secondary">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : punches.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time punches found for the selected date range.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punches.map((punch) => (
                <TableRow key={punch.id}>
                  <TableCell className="font-mono font-medium">
                    {punch.driver_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        punch.punch_type === "in"
                          ? "bg-emerald-500/20 text-emerald-600"
                          : "bg-red-500/20 text-red-600"
                      }`}
                    >
                      {punch.punch_type === "in" ? (
                        <ArrowUpCircle className="h-3 w-3" />
                      ) : (
                        <ArrowDownCircle className="h-3 w-3" />
                      )}
                      {punch.punch_type === "in" ? "Punch In" : "Punch Out"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(punch.punch_time), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {punch.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Total records: {punches.length}
      </div>
    </div>
  );
}