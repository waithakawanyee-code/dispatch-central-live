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
  code: string;
  phone: string;
  vehicle: string;
  status: DriverStatus;
}

const initialFormData: DriverFormData = {
  name: "",
  code: "",
  phone: "",
  vehicle: "",
  status: "offline",
};

const validStatuses: DriverStatus[] = ["unassigned", "assigned", "working", "punched-out", "available", "on-route", "break", "offline", "off"];

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
      { key: "code", header: "Code" },
      { key: "phone", header: "Phone" },
      { key: "vehicle", header: "Vehicle" },
      { key: "status", header: "Status" },
    ]);
    downloadCSV(csv, `drivers-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${drivers.length} drivers exported to CSV` });
  };

  const handleDownloadTemplate = () => {
    const template = "Name,Code,Phone,Vehicle,Status,Mon_In,Mon_Out,Tue_In,Tue_Out,Wed_In,Wed_Out,Thu_In,Thu_Out,Fri_In,Fri_Out,Sat_In,Sat_Out,Sun_In,Sun_Out\nJohn Doe,JDOE,555-0123,V-101,unassigned,08:00,17:00,08:00,17:00,08:00,17:00,08:00,17:00,08:00,17:00,OFF,,OFF,";
    downloadCSV(template, "drivers-template.csv");
    toast({ title: "Template Downloaded", description: "CSV template with schedule columns (Code is 4-letter identifier, Out times are optional, use OFF for days off)" });
  };

  const dayMapping: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV<Record<string, string>>(text);

      if (rows.length === 0) {
        toast({ title: "Error", description: "No valid data found in CSV", variant: "destructive" });
        return;
      }

      let driversImported = 0;
      let schedulesImported = 0;

      for (const row of rows) {
        if (!row.Name?.trim()) continue;

        // Insert driver
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .insert({
            name: row.Name.trim(),
            code: row.Code?.trim().toUpperCase().slice(0, 4) || null,
            phone: row.Phone?.trim() || null,
            vehicle: row.Vehicle?.trim() || null,
            status: (validStatuses.includes(row.Status as DriverStatus) ? row.Status : "unassigned") as DriverStatus,
          })
          .select("id")
          .single();

        if (driverError || !driverData) {
          console.error("Failed to import driver:", row.Name, driverError);
          continue;
        }

        driversImported++;

        // Parse and insert schedules
        const scheduleInserts = [];
        for (const [dayAbbrev, dayNum] of Object.entries(dayMapping)) {
          const inTime = row[`${dayAbbrev}_In`]?.trim();
          const outTime = row[`${dayAbbrev}_Out`]?.trim();

          if (inTime) {
            const isOff = inTime.toUpperCase() === "OFF";
            scheduleInserts.push({
              driver_id: driverData.id,
              day_of_week: dayNum,
              is_off: isOff,
              start_time: isOff ? null : inTime,
              end_time: isOff ? null : (outTime || null),
            });
          }
        }

        if (scheduleInserts.length > 0) {
          const { error: scheduleError } = await supabase
            .from("driver_schedules")
            .insert(scheduleInserts);

          if (!scheduleError) {
            schedulesImported += scheduleInserts.length;
          }
        }
      }

      if (driversImported === 0) {
        toast({ title: "Error", description: "No valid drivers found (name is required)", variant: "destructive" });
      } else {
        toast({ 
          title: "Success", 
          description: `${driversImported} drivers imported${schedulesImported > 0 ? ` with ${schedulesImported} schedule entries` : ""}` 
        });
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
      code: formData.code.trim().toUpperCase().slice(0, 4) || null,
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
        code: formData.code.trim().toUpperCase().slice(0, 4) || null,
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
      code: driver.code || "",
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
                  <Label htmlFor="code">Code (4 letters)</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 4) })}
                    placeholder="ABCD"
                    maxLength={4}
                    className="font-mono uppercase"
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
        CSV format: Name, Code, Phone, Vehicle, Status (available/on-route/break/offline)
      </p>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[1fr_60px_100px_80px_100px_100px] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Code</span>
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
              className="grid grid-cols-[1fr_60px_100px_80px_100px_100px] gap-4 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              {editingId === driver.id ? (
                <>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-8"
                  />
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 4) })}
                    className="h-8 font-mono uppercase"
                    maxLength={4}
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
                  <span className="font-mono text-xs text-primary">{driver.code || "-"}</span>
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
