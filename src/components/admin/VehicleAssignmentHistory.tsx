import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useAuth } from "@/hooks/useAuth";

interface AssignmentRecord {
  id: string;
  vehicle_id: string;
  vehicle_unit: string;
  driver_id: string | null;
  driver_name: string;
  assigned_at: string;
  unassigned_at: string | null;
  assigned_by: string | null;
  created_at: string;
}

export function VehicleAssignmentHistory() {
  const { vehicles, allDrivers } = useDispatchData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);

  // Form state
  const [formData, setFormData] = useState({
    vehicle_id: "",
    driver_id: "",
    assigned_at: new Date().toISOString().slice(0, 16),
    unassigned_at: "",
  });

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicle_assignment_history")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
      toast({ title: "Error", description: "Failed to load assignment history", variant: "destructive" });
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();

    // Set up realtime subscription
    const channel = supabase
      .channel("vehicle-assignment-history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_assignment_history" },
        () => fetchHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter history
  const filteredHistory = history.filter((record) => {
    if (filterVehicle !== "all" && record.vehicle_id !== filterVehicle) return false;
    if (filterDriver !== "all" && record.driver_id !== filterDriver) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + pageSize);

  const handleAdd = async () => {
    if (!formData.vehicle_id || !formData.driver_id) {
      toast({ title: "Error", description: "Vehicle and driver are required", variant: "destructive" });
      return;
    }

    const vehicle = vehicles.find((v) => v.id === formData.vehicle_id);
    const driver = allDrivers.find((d) => d.id === formData.driver_id);

    if (!vehicle || !driver) {
      toast({ title: "Error", description: "Invalid vehicle or driver", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("vehicle_assignment_history").insert({
      vehicle_id: formData.vehicle_id,
      vehicle_unit: vehicle.unit,
      driver_id: formData.driver_id,
      driver_name: driver.name,
      assigned_at: formData.assigned_at,
      unassigned_at: formData.unassigned_at || null,
      assigned_by: user?.id,
    });

    if (error) {
      console.error("Error adding record:", error);
      toast({ title: "Error", description: "Failed to add assignment record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Assignment record added" });
      setFormData({
        vehicle_id: "",
        driver_id: "",
        assigned_at: new Date().toISOString().slice(0, 16),
        unassigned_at: "",
      });
      setIsAddOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicle_assignment_history").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Record deleted" });
    }
  };

  const handleMarkUnassigned = async (id: string) => {
    const { error } = await supabase
      .from("vehicle_assignment_history")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update record", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Marked as unassigned" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Vehicle Assignment History
        </h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Assignment Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Driver *</Label>
                <Select
                  value={formData.driver_id}
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned At</Label>
                <Input
                  type="datetime-local"
                  value={formData.assigned_at}
                  onChange={(e) => setFormData({ ...formData, assigned_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unassigned At (optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.unassigned_at}
                  onChange={(e) => setFormData({ ...formData, unassigned_at: e.target.value })}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Vehicle:</Label>
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
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
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Driver:</Label>
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {allDrivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[100px_1fr_160px_160px_80px] gap-3 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Vehicle</span>
          <span>Driver</span>
          <span>Assigned</span>
          <span>Unassigned</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No assignment history found.
          </div>
        ) : (
          paginatedHistory.map((record) => (
            <div
              key={record.id}
              className="grid grid-cols-[100px_1fr_160px_160px_80px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0 items-center"
            >
              <span className="font-mono font-medium">{record.vehicle_unit}</span>
              <span className="text-muted-foreground">{record.driver_name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(record.assigned_at), "MMM d, yyyy h:mm a")}
              </span>
              <span className="text-xs text-muted-foreground">
                {record.unassigned_at ? (
                  format(new Date(record.unassigned_at), "MMM d, yyyy h:mm a")
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleMarkUnassigned(record.id)}
                  >
                    Mark Unassigned
                  </Button>
                )}
              </span>
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Record</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this assignment record? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(record.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground mr-2">
                {startIndex + 1}-{Math.min(startIndex + pageSize, filteredHistory.length)} of{" "}
                {filteredHistory.length}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
