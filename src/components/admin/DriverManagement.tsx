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

type DriverStatus = Database["public"]["Enums"]["driver_status"];

interface DriverFormData {
  name: string;
  phone: string;
  vehicle: string;
  status: DriverStatus;
}

const initialFormData: DriverFormData = {
  name: "",
  phone: "",
  vehicle: "",
  status: "offline",
};

const validStatuses: DriverStatus[] = ["available", "on-route", "break", "offline"];

export function DriverManagement() {
  const { drivers } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(initialFormData);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = generateCSV(drivers, [
      { key: "name", header: "Name" },
      { key: "phone", header: "Phone" },
      { key: "vehicle", header: "Vehicle" },
      { key: "status", header: "Status" },
    ]);
    downloadCSV(csv, `drivers-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${drivers.length} drivers exported to CSV` });
  };

  const handleDownloadTemplate = () => {
    const template = "Name,Phone,Vehicle,Status\nJohn Doe,555-0123,V-101,available";
    downloadCSV(template, "drivers-template.csv");
    toast({ title: "Template Downloaded", description: "CSV template with example row" });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV<{ name: string; phone?: string; vehicle?: string; status?: string }>(text);

      if (rows.length === 0) {
        toast({ title: "Error", description: "No valid data found in CSV", variant: "destructive" });
        return;
      }

      const validRows = rows
        .filter(row => row.name?.trim())
        .map(row => ({
          name: row.name.trim(),
          phone: row.phone?.trim() || null,
          vehicle: row.vehicle?.trim() || null,
          status: (validStatuses.includes(row.status as DriverStatus) ? row.status : "offline") as DriverStatus,
        }));

      if (validRows.length === 0) {
        toast({ title: "Error", description: "No valid drivers found (name is required)", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("drivers").insert(validRows);

      if (error) {
        toast({ title: "Error", description: "Failed to import drivers", variant: "destructive" });
      } else {
        toast({ title: "Success", description: `${validRows.length} drivers imported successfully` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to parse CSV file", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("drivers").insert({
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      vehicle: formData.vehicle.trim() || null,
      status: formData.status,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add driver", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Driver added successfully" });
      setFormData(initialFormData);
      setIsAddOpen(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("drivers")
      .update({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        vehicle: formData.vehicle.trim() || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update driver", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Driver updated successfully" });
      setEditingId(null);
      setFormData(initialFormData);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("drivers").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete driver", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Driver deleted successfully" });
    }
  };

  const startEdit = (driver: typeof drivers[0]) => {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      phone: driver.phone || "",
      vehicle: driver.vehicle || "",
      status: driver.status,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Drivers</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4" />
            Template
          </Button>
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
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Driver name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Assigned Vehicle</Label>
                  <Input
                    id="vehicle"
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    placeholder="V-101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: DriverStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="on-route">On Route</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full">Add Driver</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV format: Name, Phone, Vehicle, Status (available/on-route/break/offline)
      </p>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Phone</span>
          <span>Vehicle</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        
        {drivers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No drivers found. Add your first driver above.
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              {editingId === driver.id ? (
                <>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="h-8"
                  />
                  <Select
                    value={formData.status}
                    onValueChange={(value: DriverStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="on-route">On Route</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(driver.id)}>
                      <Check className="h-4 w-4 text-status-available" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-medium">{driver.name}</span>
                  <span className="font-mono text-muted-foreground">{driver.phone || "-"}</span>
                  <span className="font-mono text-primary">{driver.vehicle || "-"}</span>
                  <StatusBadge status={driver.status} size="sm" />
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(driver)}>
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
                          <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {driver.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(driver.id)}>Delete</AlertDialogAction>
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
