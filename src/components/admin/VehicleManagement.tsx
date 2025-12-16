import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Download, Upload } from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";
import { parseCSV, generateCSV, downloadCSV } from "@/lib/csv";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];

interface VehicleFormData {
  unit: string;
  driver: string;
  mileage: string;
  status: VehicleStatus;
  clean_status: CleanStatus;
}

const initialFormData: VehicleFormData = {
  unit: "",
  driver: "",
  mileage: "",
  status: "active",
  clean_status: "clean",
};

const validStatuses: VehicleStatus[] = ["active", "out-of-service"];
const validCleanStatuses: CleanStatus[] = ["clean", "dirty"];

export function VehicleManagement() {
  const { vehicles } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = generateCSV(vehicles, [
      { key: "unit", header: "Unit" },
      { key: "driver", header: "Driver" },
      { key: "mileage", header: "Mileage" },
      { key: "status", header: "Status" },
      { key: "clean_status", header: "Clean Status" },
    ]);
    downloadCSV(csv, `vehicles-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${vehicles.length} vehicles exported to CSV` });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV<{
        unit: string;
        driver?: string;
        mileage?: string;
        status?: string;
        clean_status?: string;
      }>(text);

      if (rows.length === 0) {
        toast({ title: "Error", description: "No valid data found in CSV", variant: "destructive" });
        return;
      }

      const validRows = rows
        .filter(row => row.unit?.trim())
        .map(row => ({
          unit: row.unit.trim(),
          driver: row.driver?.trim() || null,
          mileage: row.mileage ? parseInt(row.mileage) : null,
          status: (validStatuses.includes(row.status as VehicleStatus) ? row.status : "active") as VehicleStatus,
          clean_status: (validCleanStatuses.includes(row.clean_status as CleanStatus) ? row.clean_status : "clean") as CleanStatus,
        }));

      if (validRows.length === 0) {
        toast({ title: "Error", description: "No valid vehicles found (unit is required)", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("vehicles").insert(validRows);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Error", description: "Some vehicle units already exist", variant: "destructive" });
        } else {
          toast({ title: "Error", description: "Failed to import vehicles", variant: "destructive" });
        }
      } else {
        toast({ title: "Success", description: `${validRows.length} vehicles imported successfully` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to parse CSV file", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAdd = async () => {
    if (!formData.unit.trim()) {
      toast({ title: "Error", description: "Unit ID is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("vehicles").insert({
      unit: formData.unit.trim(),
      driver: formData.driver.trim() || null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      status: formData.status,
      clean_status: formData.clean_status,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "A vehicle with this unit ID already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add vehicle", variant: "destructive" });
      }
    } else {
      toast({ title: "Success", description: "Vehicle added successfully" });
      setFormData(initialFormData);
      setIsAddOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.unit.trim()) {
      toast({ title: "Error", description: "Unit ID is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        unit: formData.unit.trim(),
        driver: formData.driver.trim() || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        status: formData.status,
        clean_status: formData.clean_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update vehicle", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Vehicle updated successfully" });
      setEditingId(null);
      setFormData(initialFormData);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete vehicle", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Vehicle deleted successfully" });
    }
  };

  const startEdit = (vehicle: typeof vehicles[0]) => {
    setEditingId(vehicle.id);
    setFormData({
      unit: vehicle.unit,
      driver: vehicle.driver || "",
      mileage: vehicle.mileage?.toString() || "",
      status: vehicle.status,
      clean_status: vehicle.clean_status,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Vehicles</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Import"}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit ID *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="V-109"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Assigned Driver</Label>
                  <Input
                    id="driver"
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    placeholder="Driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: VehicleStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="out-of-service">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clean_status">Clean Status</Label>
                    <Select
                      value={formData.clean_status}
                      onValueChange={(value: CleanStatus) => setFormData({ ...formData, clean_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clean">Clean</SelectItem>
                        <SelectItem value="dirty">Dirty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full">Add Vehicle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV format: Unit, Driver, Mileage, Status (active/out-of-service), Clean Status (clean/dirty)
      </p>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[100px_1fr_100px_100px_100px_100px] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Unit</span>
          <span>Driver</span>
          <span>Mileage</span>
          <span>Status</span>
          <span>Clean</span>
          <span className="text-right">Actions</span>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No vehicles found. Add your first vehicle above.
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="grid grid-cols-[100px_1fr_100px_100px_100px_100px] gap-4 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              {editingId === vehicle.id ? (
                <>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    className="h-8"
                  />
                  <Select
                    value={formData.status}
                    onValueChange={(value: VehicleStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="out-of-service">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.clean_status}
                    onValueChange={(value: CleanStatus) => setFormData({ ...formData, clean_status: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean">Clean</SelectItem>
                      <SelectItem value="dirty">Dirty</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(vehicle.id)}>
                      <Check className="h-4 w-4 text-status-available" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-mono font-medium">{vehicle.unit}</span>
                  <span className="text-muted-foreground">{vehicle.driver || "-"}</span>
                  <span className="font-mono text-muted-foreground">
                    {vehicle.mileage ? vehicle.mileage.toLocaleString() : "-"}
                  </span>
                  <StatusBadge status={vehicle.status} size="sm" />
                  <StatusBadge status={vehicle.clean_status} size="sm" />
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(vehicle)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {vehicle.unit}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
