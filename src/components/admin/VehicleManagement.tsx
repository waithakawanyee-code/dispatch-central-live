import { useState, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Home,
  User,
  Filter,
  Droplets,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  DropdownMenuItem,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CleanStatus = Database["public"]["Enums"]["clean_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type VehicleClassification = "house" | "take_home";
type VehiclePrimaryCategory = "above_all" | "specialty";

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
  notes: string;
  primary_category: VehiclePrimaryCategory;
  classification: VehicleClassification;
  assigned_driver_id: string;
  phone: string;
  has_car_wash_subscription: boolean;
}

const initialFormData: VehicleFormData = {
  unit: "",
  driver: "",
  status: "active",
  clean_status: "clean",
  vehicle_type: "",
  notes: "",
  primary_category: "above_all",
  classification: "house",
  assigned_driver_id: "",
  phone: "",
  has_car_wash_subscription: false,
};

const validStatuses: VehicleStatus[] = ["active", "out-of-service"];
const validCleanStatuses: CleanStatus[] = ["clean", "dirty"];
const validVehicleTypes: VehicleType[] = VEHICLE_TYPES.map((t) => t.value);

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | "all">("all");
  const [filterType, setFilterType] = useState<VehicleType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<VehiclePrimaryCategory | "all">("all");
  const [filterClassification, setFilterClassification] = useState<VehicleClassification | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Apply filters
  const filteredVehicles = vehicles.filter((v) => {
    if (filterStatus !== "all" && v.status !== filterStatus) return false;
    if (filterType !== "all" && v.vehicle_type !== filterType) return false;
    if (filterCategory !== "all" && v.primary_category !== filterCategory) return false;
    if (filterClassification !== "all" && v.classification !== filterClassification) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchUnit = v.unit?.toLowerCase().includes(q);
      const matchDriver = v.driver?.toLowerCase().includes(q);
      const matchNotes = v.notes?.toLowerCase().includes(q);
      if (!matchUnit && !matchDriver && !matchNotes) return false;
    }
    return true;
  });

  const hasActiveFilters = filterStatus !== "all" || filterType !== "all" || filterCategory !== "all" || filterClassification !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterType("all");
    setFilterCategory("all");
    setFilterClassification("all");
    setSearchQuery("");
  };

  // Pagination (use filtered vehicles)
  const totalPages = Math.ceil(filteredVehicles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + pageSize);

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

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from("vehicles").delete().in("id", Array.from(selectedIds));

    if (error) {
      toast({ title: "Error", description: "Failed to delete vehicles", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.size} vehicle(s) deleted` });
      setSelectedIds(new Set());
    }
  };

  const bulkToggleCarWash = async (hasSubscription: boolean) => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase
      .from("vehicles")
      .update({ has_car_wash_subscription: hasSubscription, updated_at: new Date().toISOString() })
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({ title: "Error", description: "Failed to update car wash subscriptions", variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: `${selectedIds.size} vehicle(s) ${hasSubscription ? "now have" : "no longer have"} car wash subscription` 
      });
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    const csv = generateCSV(vehicles, [
      { key: "unit", header: "Unit" },
      { key: "vehicle_type", header: "Vehicle Type" },
      { key: "primary_category", header: "Primary Category" },
      { key: "classification", header: "Classification" },
      { key: "driver", header: "Driver" },
      { key: "phone", header: "Phone" },
      { key: "status", header: "Status" },
      { key: "clean_status", header: "Clean Status" },
      { key: "notes", header: "Notes" },
    ]);
    downloadCSV(csv, `vehicles-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${vehicles.length} vehicles exported to CSV` });
  };

  const handleDownloadTemplate = () => {
    const template =
      "Unit,Vehicle Type,Primary Category,Classification,Driver,Phone,Status,Clean Status,Notes\nV-109,sedan_volvo,above_all,house,Jane Smith,555-123-4567,active,clean,Maintenance note";
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
        primary_category?: string;
        classification?: string;
        driver?: string;
        phone?: string;
        status?: string;
        clean_status?: string;
        notes?: string;
      }>(text);

      if (rows.length === 0) {
        toast({ title: "Error", description: "No valid data found in CSV", variant: "destructive" });
        return;
      }

      // Helper to match vehicle type by value or label
      const matchVehicleType = (input?: string): VehicleType | null => {
        if (!input) return null;
        const trimmed = input.trim().toLowerCase();
        // Try exact match on value
        const byValue = VEHICLE_TYPES.find((t) => t.value.toLowerCase() === trimmed);
        if (byValue) return byValue.value;
        // Try match on label
        const byLabel = VEHICLE_TYPES.find((t) => t.label.toLowerCase() === trimmed);
        if (byLabel) return byLabel.value;
        return null;
      };

      // Helper to match primary category
      const matchPrimaryCategory = (input?: string): VehiclePrimaryCategory => {
        if (!input) return "above_all";
        const trimmed = input.trim().toLowerCase().replace(/\s+/g, "_");
        if (trimmed === "specialty") return "specialty";
        return "above_all";
      };

      // Helper to match classification
      const matchClassification = (input?: string): VehicleClassification => {
        if (!input) return "house";
        const trimmed = input.trim().toLowerCase().replace(/\s+/g, "_");
        if (trimmed === "take_home" || trimmed === "takehome") return "take_home";
        return "house";
      };

      const validRows = rows
        .filter((row) => row.unit?.trim())
        .map((row) => {
          const primaryCategory = matchPrimaryCategory(row.primary_category);
          return {
            unit: row.unit.trim(),
            vehicle_type: matchVehicleType(row.vehicle_type),
            primary_category: primaryCategory,
            classification: primaryCategory === "above_all" ? matchClassification(row.classification) : "house" as VehicleClassification,
            driver: row.driver?.trim() || null,
            phone: row.phone?.trim() || null,
            status: (validStatuses.includes(row.status as VehicleStatus) ? row.status : "active") as VehicleStatus,
            clean_status: (validCleanStatuses.includes(row.clean_status as CleanStatus)
              ? row.clean_status
              : "clean") as CleanStatus,
            notes: row.notes?.trim() || null,
          };
        });

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
      phone: formData.phone.trim() || null,
      status: formData.status,
      clean_status: formData.clean_status,
      notes: formData.notes.trim() || null,
      primary_category: formData.primary_category,
      classification: formData.primary_category === "above_all" ? formData.classification : "house",
      assigned_driver_id: formData.assigned_driver_id || null,
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
        phone: formData.phone.trim() || null,
        status: formData.status,
        clean_status: formData.clean_status,
        notes: formData.notes.trim() || null,
        primary_category: formData.primary_category,
        classification: formData.primary_category === "above_all" ? formData.classification : "house",
        assigned_driver_id: formData.assigned_driver_id || null,
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

  const startEdit = (vehicle: (typeof vehicles)[0]) => {
    setEditingId(vehicle.id);
    setExpandedId(vehicle.id);
    setFormData({
      unit: vehicle.unit,
      vehicle_type: vehicle.vehicle_type || "",
      driver: vehicle.driver || "",
      status: vehicle.status,
      clean_status: vehicle.clean_status,
      notes: (vehicle as any).notes || "",
      primary_category: (vehicle as any).primary_category || "above_all",
      classification: (vehicle as any).classification || "house",
      assigned_driver_id: (vehicle as any).assigned_driver_id || "",
      phone: (vehicle as any).phone || "",
      has_car_wash_subscription: (vehicle as any).has_car_wash_subscription || false,
    });
  };

  const getVehicleTypeLabel = (type: VehicleType | null) => {
    if (!type) return "-";
    const found = VEHICLE_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  // Check if selected vehicle type requires CDL
  const vehicleRequiresCdl = (vehicleType: VehicleType | "") => {
    if (!vehicleType) return false;
    const found = VEHICLE_TYPES.find((t) => t.value === vehicleType);
    return found?.requiresCdl || false;
  };

  // Filter drivers based on vehicle type CDL requirement
  const getAvailableDrivers = () => {
    const activeDrivers = allDrivers.filter((d) => d.is_active);
    if (vehicleRequiresCdl(formData.vehicle_type)) {
      return activeDrivers.filter((d) => d.has_cdl);
    }
    return activeDrivers;
  };

  // Check for CDL mismatch warning
  const hasCdlMismatch = () => {
    if (!formData.driver || !formData.vehicle_type) return false;
    const requiresCdl = vehicleRequiresCdl(formData.vehicle_type);
    if (!requiresCdl) return false;
    const driver = allDrivers.find((d) => d.name === formData.driver);
    return driver && !driver.has_cdl;
  };

  // Check if a specific vehicle has CDL mismatch
  const vehicleHasCdlMismatch = (vehicle: (typeof vehicles)[0]) => {
    if (!vehicle.driver || !vehicle.vehicle_type) return false;
    const typeInfo = VEHICLE_TYPES.find((t) => t.value === vehicle.vehicle_type);
    if (!typeInfo?.requiresCdl) return false;
    const driver = allDrivers.find((d) => d.name === vehicle.driver);
    return driver && !driver.has_cdl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Vehicles</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Vehicles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importing..." : "Import Vehicles"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
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
                    placeholder="Veh ID"
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
                      {getAvailableDrivers().map((driver) => (
                        <SelectItem key={driver.id} value={driver.name}>
                          {driver.name} {driver.has_cdl && <span className="text-muted-foreground">(CDL)</span>}
                        </SelectItem>
                      ))}
                      {vehicleRequiresCdl(formData.vehicle_type) && getAvailableDrivers().length === 0 && (
                        <SelectItem value="_none" disabled>
                          No CDL drivers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-123-4567"
                  />
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
                        {VEHICLE_TYPES.filter((t) => !t.requiresCdl).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>CDL Required</SelectLabel>
                        {VEHICLE_TYPES.filter((t) => t.requiresCdl).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Category *</Label>
                  <Select
                    value={formData.primary_category}
                    onValueChange={(value: VehiclePrimaryCategory) => {
                      setFormData({
                        ...formData,
                        primary_category: value,
                        classification: value === "specialty" ? "house" : formData.classification,
                        assigned_driver_id: value === "specialty" ? "" : formData.assigned_driver_id,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above_all">Above All</SelectItem>
                      <SelectItem value="specialty">Specialty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.primary_category === "above_all" && (
                  <div className="space-y-2">
                    <Label>Secondary Category</Label>
                    <Select
                      value={formData.classification}
                      onValueChange={(value: VehicleClassification) => {
                        setFormData({
                          ...formData,
                          classification: value,
                          assigned_driver_id: value === "house" ? "" : formData.assigned_driver_id,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">Fleet</SelectItem>
                        <SelectItem value="take_home">Take Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.primary_category === "above_all" && formData.classification === "take_home" && (
                  <div className="space-y-2">
                    <Label>Take-Home Driver</Label>
                    <Select
                      value={formData.assigned_driver_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assigned_driver_id: value === "_none" ? "" : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No driver assigned</SelectItem>
                        {allDrivers
                          .filter((d) => d.is_active)
                          .map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name} {driver.has_cdl && <span className="text-muted-foreground">(CDL)</span>}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Only active vehicles can be assigned</p>
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
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Maintenance notes, etc."
                    rows={3}
                  />
                </div>
                {hasCdlMismatch() && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Warning: {formData.driver} does not have a CDL but this vehicle type requires one.</span>
                  </div>
                )}
                <Button onClick={handleAdd} className="w-full">
                  Add Vehicle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search unit, driver, notes..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="h-8 w-48 pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {[filterStatus !== "all", filterType !== "all", filterCategory !== "all", filterClassification !== "all"].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filterStatus} onValueChange={(v) => { setFilterStatus(v as VehicleStatus | "all"); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All Status</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="out-of-service">Out of Service</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filterType} onValueChange={(v) => { setFilterType(v as VehicleType | "all"); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All Types</DropdownMenuRadioItem>
              {VEHICLE_TYPES.map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>{t.label}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filterCategory} onValueChange={(v) => { setFilterCategory(v as VehiclePrimaryCategory | "all"); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="above_all">Above All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="specialty">Specialty</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Classification</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filterClassification} onValueChange={(v) => { setFilterClassification(v as VehicleClassification | "all"); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All Classifications</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="house">Fleet</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="take_home">Take Home</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={clearFilters}
                  className="w-full px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors text-left"
                >
                  Reset all filters
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredVehicles.length} of {vehicles.length} vehicles
        </span>
      </div>

      {/* Bulk actions */}
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
          <Button size="sm" variant="outline" onClick={() => bulkToggleCarWash(true)}>
            <Droplets className="h-4 w-4 mr-1" />
            Add Car Wash
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkToggleCarWash(false)}>
            <Droplets className="h-4 w-4 mr-1 opacity-50" />
            Remove Car Wash
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} vehicle(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected vehicles.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[32px_100px_120px_110px_90px_90px] gap-3 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <Checkbox
                  checked={paginatedVehicles.length > 0 && selectedIds.size === filteredVehicles.length}
                  className="pointer-events-none"
                  aria-label="Select all"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Selection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value="">
                <DropdownMenuRadioItem
                  value="all-page"
                  onClick={() => setSelectedIds(new Set(paginatedVehicles.map((v) => v.id)))}
                >
                  Select page ({paginatedVehicles.length})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="all-filtered"
                  onClick={() => setSelectedIds(new Set(filteredVehicles.map((v) => v.id)))}
                >
                  Select all filtered ({filteredVehicles.length})
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
          <span>Phone</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {vehicles.length === 0 ? "No vehicles found. Add your first vehicle above." : "No vehicles match the current filters."}
          </div>
        ) : (
          paginatedVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="grid grid-cols-[32px_100px_120px_110px_90px_90px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0 items-center"
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
                        {VEHICLE_TYPES.filter((t) => !t.requiresCdl).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>CDL Required</SelectLabel>
                        {VEHICLE_TYPES.filter((t) => t.requiresCdl).map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone"
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
                  <span className="font-mono font-medium flex items-center gap-1">
                    {vehicle.unit}
                    {(vehicle as any).classification === "take_home" ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        title="Take Home"
                      >
                        <User className="h-3 w-3" />
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                        title="Fleet"
                      >
                        <Home className="h-3 w-3" />
                      </span>
                    )}
                    {(vehicle as any).has_car_wash_subscription && (
                      <span title="Car Wash Subscription">
                        <Droplets className="h-3.5 w-3.5 text-cyan-500" />
                      </span>
                    )}
                    {(vehicle as any).notes && <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {getVehicleTypeLabel(vehicle.vehicle_type)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate font-mono">
                    {vehicle.phone || "—"}
                  </span>
                  <StatusBadge status={vehicle.status} size="sm" />
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expandedId === vehicle.id ? null : vehicle.id)}
                    >
                      {expandedId === vehicle.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
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
              {/* Expandable Edit Row */}
              {expandedId === vehicle.id && (
                <div className="col-span-6 px-2 pb-3 pt-1 space-y-3">
                  {editingId === vehicle.id ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Primary Category</Label>
                          <Select
                            value={formData.primary_category}
                            onValueChange={(value: VehiclePrimaryCategory) => {
                              setFormData({
                                ...formData,
                                primary_category: value,
                                classification: value === "specialty" ? "house" : formData.classification,
                                assigned_driver_id: value === "specialty" ? "" : formData.assigned_driver_id,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above_all">Above All</SelectItem>
                              <SelectItem value="specialty">Specialty</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.primary_category === "above_all" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Secondary Category</Label>
                            <Select
                              value={formData.classification}
                              onValueChange={(value: VehicleClassification) => {
                                setFormData({
                                  ...formData,
                                  classification: value,
                                  assigned_driver_id: value === "house" ? "" : formData.assigned_driver_id,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="house">Fleet</SelectItem>
                                <SelectItem value="take_home">Take Home</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {formData.primary_category === "above_all" && formData.classification === "take_home" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Assigned Driver</Label>
                            <Select
                              value={formData.driver || "_none"}
                              onValueChange={(value) => setFormData({ ...formData, driver: value === "_none" ? "" : value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">No driver</SelectItem>
                                {allDrivers.filter(d => d.is_active).map((driver) => (
                                  <SelectItem key={driver.id} value={driver.name}>
                                    {driver.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {formData.primary_category === "above_all" && (
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            id="car-wash-sub"
                            checked={formData.has_car_wash_subscription}
                            onCheckedChange={(checked) => setFormData({ ...formData, has_car_wash_subscription: !!checked })}
                          />
                          <Label htmlFor="car-wash-sub" className="text-xs cursor-pointer">
                            Car Wash Subscription
                          </Label>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Add notes..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {(vehicle as any).has_car_wash_subscription && (
                        <div className="flex items-center gap-1.5 text-xs text-cyan-600">
                          <Droplets className="h-3.5 w-3.5" />
                          <span>Car Wash Subscription</span>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground bg-secondary/30 rounded-md px-3 py-2">
                        {(vehicle as any).notes || "No notes"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination Controls */}
        {vehicles.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
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
