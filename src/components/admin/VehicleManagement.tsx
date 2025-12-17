import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Download, Upload, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";
import { StatusBadge } from "@/components/StatusBadge";
import { parseCSV, generateCSV, downloadCSV } from "@/lib/csv";
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

// Vehicle types with CDL requirements
export const VEHICLE_TYPES: { value: VehicleType; label: string; requiresCdl: boolean }[] = [
  { value: "sedan_volvo", label: "Sedan-Volvo", requiresCdl: false },
  { value: "sedan_aviator", label: "Sedan Aviator", requiresCdl: false },
  { value: "suv", label: "SUV", requiresCdl: false },
  { value: "exec_transit", label: "Exec Transit", requiresCdl: false },
  { value: "sprinter_limo", label: "Sprinter Limo", requiresCdl: false },
  { value: "stretch_limo", label: "Stretch Limo", requiresCdl: false },
  { value: "28_shuttle", label: "28 Shuttle", requiresCdl: true },
  { value: "37_shuttle", label: "37 Shuttle", requiresCdl: true },
  { value: "39_shuttle", label: "39 Shuttle", requiresCdl: true },
  { value: "56_mc", label: "56 MC", requiresCdl: true },
  { value: "32_limo_bus", label: "32-Limo Bus", requiresCdl: true },
  { value: "trolley", label: "Trolley", requiresCdl: true },
];

interface VehicleFormData {
  unit: string;
  driver: string;
  status: VehicleStatus;
  clean_status: CleanStatus;
  vehicle_type: VehicleType | "";
}

const initialFormData: VehicleFormData = {
  unit: "",
  driver: "",
  status: "active",
  clean_status: "clean",
  vehicle_type: "",
};

const validStatuses: VehicleStatus[] = ["active", "out-of-service"];
const validCleanStatuses: CleanStatus[] = ["clean", "dirty"];
const validVehicleTypes: VehicleType[] = VEHICLE_TYPES.map(t => t.value);

export function VehicleManagement() {
  const { vehicles, allDrivers } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const totalPages = Math.ceil(vehicles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = vehicles.slice(startIndex, startIndex + pageSize);

  const toggleSelectVehicle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bulkSetStatus = async (status: VehicleStatus) => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase
      .from("vehicles")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({ title: "Error", description: "Failed to update vehicles", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.size} vehicle(s) set to ${status}` });
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    const csv = generateCSV(vehicles, [
      { key: "unit", header: "Unit" },
      { key: "vehicle_type", header: "Vehicle Type" },
      { key: "driver", header: "Driver" },
      { key: "status", header: "Status" },
      { key: "clean_status", header: "Clean Status" },
    ]);
    downloadCSV(csv, `vehicles-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${vehicles.length} vehicles exported to CSV` });
  };

  const handleDownloadTemplate = () => {
    const template = "Unit,Vehicle Type,Driver,Status,Clean Status\nV-109,sedan_volvo,Jane Smith,active,clean";
    downloadCSV(template, "vehicles-template.csv");
    toast({ title: "Template Downloaded", description: "CSV template with example row" });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV<{
        unit: string;
        vehicle_type?: string;
        driver?: string;
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
          vehicle_type: validVehicleTypes.includes(row.vehicle_type as VehicleType) ? row.vehicle_type as VehicleType : null,
          driver: row.driver?.trim() || null,
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
      vehicle_type: formData.vehicle_type || null,
      driver: formData.driver.trim() || null,
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
        vehicle_type: formData.vehicle_type || null,
        driver: formData.driver.trim() || null,
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
      vehicle_type: vehicle.vehicle_type || "",
      driver: vehicle.driver || "",
      status: vehicle.status,
      clean_status: vehicle.clean_status,
    });
  };

  const getVehicleTypeLabel = (type: VehicleType | null) => {
    if (!type) return "-";
    const found = VEHICLE_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  // Check if selected vehicle type requires CDL
  const vehicleRequiresCdl = (vehicleType: VehicleType | "") => {
    if (!vehicleType) return false;
    const found = VEHICLE_TYPES.find(t => t.value === vehicleType);
    return found?.requiresCdl || false;
  };

  // Filter drivers based on vehicle type CDL requirement
  const getAvailableDrivers = () => {
    const activeDrivers = allDrivers.filter(d => d.is_active);
    if (vehicleRequiresCdl(formData.vehicle_type)) {
      return activeDrivers.filter(d => d.has_cdl);
    }
    return activeDrivers;
  };

  // Check for CDL mismatch warning
  const hasCdlMismatch = () => {
    if (!formData.driver || !formData.vehicle_type) return false;
    const requiresCdl = vehicleRequiresCdl(formData.vehicle_type);
    if (!requiresCdl) return false;
    const driver = allDrivers.find(d => d.name === formData.driver);
    return driver && !driver.has_cdl;
  };

  // Check if a specific vehicle has CDL mismatch
  const vehicleHasCdlMismatch = (vehicle: typeof vehicles[0]) => {
    if (!vehicle.driver || !vehicle.vehicle_type) return false;
    const typeInfo = VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type);
    if (!typeInfo?.requiresCdl) return false;
    const driver = allDrivers.find(d => d.name === vehicle.driver);
    return driver && !driver.has_cdl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Vehicles</h2>
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
                  <Label htmlFor="driver">
                    Assigned Driver
                    {vehicleRequiresCdl(formData.vehicle_type) && (
                      <span className="ml-2 text-xs text-amber-600">(CDL required)</span>
                    )}
                  </Label>
                  <Select
                    value={formData.driver}
                    onValueChange={(value) => setFormData({ ...formData, driver: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No driver</SelectItem>
                      {getAvailableDrivers().map(driver => (
                        <SelectItem key={driver.id} value={driver.name}>
                          {driver.name} {driver.has_cdl && <span className="text-muted-foreground">(CDL)</span>}
                        </SelectItem>
                      ))}
                      {vehicleRequiresCdl(formData.vehicle_type) && getAvailableDrivers().length === 0 && (
                        <SelectItem value="_none" disabled>No CDL drivers available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value: VehicleType) => setFormData({ ...formData, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Non-CDL</SelectLabel>
                        {VEHICLE_TYPES.filter(t => !t.requiresCdl).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>CDL Required</SelectLabel>
                        {VEHICLE_TYPES.filter(t => t.requiresCdl).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
                {hasCdlMismatch() && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Warning: {formData.driver} does not have a CDL but this vehicle type requires one.</span>
                  </div>
                )}
                <Button onClick={handleAdd} className="w-full">Add Vehicle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          CSV format: Unit, Vehicle Type (e.g. sedan_volvo), Driver, Mileage, Status, Clean Status
        </p>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("active")}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Set Active
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("out-of-service")}>
              <XCircle className="h-4 w-4 mr-1" />
              Out of Service
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[32px_80px_110px_1fr_80px_90px_80px_90px] gap-3 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <Checkbox
                  checked={paginatedVehicles.length > 0 && selectedIds.size === vehicles.length}
                  className="pointer-events-none"
                  aria-label="Select all"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Selection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value="">
                <DropdownMenuRadioItem value="all-page" onClick={() => setSelectedIds(new Set(paginatedVehicles.map((v) => v.id)))}>
                  Select page ({paginatedVehicles.length})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all-vehicles" onClick={() => setSelectedIds(new Set(vehicles.map((v) => v.id)))}>
                  Select all vehicles ({vehicles.length})
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="none" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span>Unit</span>
          <span>Type</span>
          <span>Driver</span>
          <span>Status</span>
          <span>Clean</span>
          <span className="text-right">Actions</span>
        </div>
        
        {vehicles.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No vehicles found. Add your first vehicle above.
          </div>
        ) : (
          paginatedVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="grid grid-cols-[32px_80px_110px_1fr_90px_80px_90px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0 items-center"
            >
              <Checkbox
                checked={selectedIds.has(vehicle.id)}
                onCheckedChange={() => toggleSelectVehicle(vehicle.id)}
                aria-label={`Select ${vehicle.unit}`}
              />
              {editingId === vehicle.id ? (
                <>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="h-8"
                  />
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value: VehicleType) => setFormData({ ...formData, vehicle_type: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Non-CDL</SelectLabel>
                        {VEHICLE_TYPES.filter(t => !t.requiresCdl).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>CDL Required</SelectLabel>
                        {VEHICLE_TYPES.filter(t => t.requiresCdl).map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.driver || "_none"}
                    onValueChange={(value) => setFormData({ ...formData, driver: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {getAvailableDrivers().map(driver => (
                        <SelectItem key={driver.id} value={driver.name}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <span className="text-xs text-muted-foreground truncate">{getVehicleTypeLabel(vehicle.vehicle_type)}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {vehicle.driver || "-"}
                    {vehicleHasCdlMismatch(vehicle) && (
                      <span title="Driver does not have CDL for this vehicle type">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
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
        
        {/* Pagination Controls */}
        {vehicles.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground mr-2">
                {startIndex + 1}-{Math.min(startIndex + pageSize, vehicles.length)} of {vehicles.length}
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
