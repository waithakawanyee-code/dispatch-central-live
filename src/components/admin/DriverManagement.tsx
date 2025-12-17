import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Download, Upload, Search, SlidersHorizontal } from "lucide-react";
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
import { parseCSV, generateCSV, downloadCSV } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";

interface DriverFormData {
  name: string;
  code: string;
  phone: string;
  is_active: boolean;
  has_cdl: boolean;
}

const initialFormData: DriverFormData = {
  name: "",
  code: "",
  phone: "",
  is_active: true,
  has_cdl: false,
};

export function DriverManagement() {
  const { allDrivers: drivers } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DriverFormData>(initialFormData);
  const [importing, setImporting] = useState(false);
  const [cdlFilter, setCdlFilter] = useState<"all" | "cdl" | "non-cdl">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "cdl" | "status">("name");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDrivers = drivers
    .filter((driver) => {
      const matchesSearch = searchQuery === "" || 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (driver.code?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCdl = cdlFilter === "all" || 
        (cdlFilter === "cdl" ? (driver as any).has_cdl === true : (driver as any).has_cdl !== true);
      const matchesActive = activeFilter === "all" || 
        (activeFilter === "active" ? (driver as any).is_active !== false : (driver as any).is_active === false);
      return matchesSearch && matchesCdl && matchesActive;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "cdl") {
        const aCdl = (a as any).has_cdl ? 1 : 0;
        const bCdl = (b as any).has_cdl ? 1 : 0;
        return bCdl - aCdl; // CDL first
      }
      if (sortBy === "status") {
        const aActive = (a as any).is_active !== false ? 1 : 0;
        const bActive = (b as any).is_active !== false ? 1 : 0;
        return bActive - aActive; // Active first
      }
      return 0;
    });

  const handleExport = () => {
    const exportData = drivers.map(d => ({
      ...d,
      is_active: (d as any).is_active !== false ? "Active" : "Inactive",
      has_cdl: (d as any).has_cdl ? "CDL" : "Non-CDL"
    }));
    const csv = generateCSV(exportData, [
      { key: "name", header: "Name" },
      { key: "code", header: "Code" },
      { key: "phone", header: "Phone" },
      { key: "vehicle", header: "Vehicle" },
      { key: "is_active", header: "Status" },
      { key: "has_cdl", header: "CDL" },
    ]);
    downloadCSV(csv, `drivers-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Exported", description: `${drivers.length} drivers exported to CSV` });
  };

  const handleDownloadTemplate = () => {
    const template = "Name,Code,Phone,Vehicle,Active,CDL,Mon_In,Mon_Out,Tue_In,Tue_Out,Wed_In,Wed_Out,Thu_In,Thu_Out,Fri_In,Fri_Out,Sat_In,Sat_Out,Sun_In,Sun_Out\nJohn Doe,JDOE,555-0123,V-101,yes,yes,08:00,17:00,08:00,17:00,08:00,17:00,08:00,17:00,08:00,17:00,OFF,,OFF,";
    downloadCSV(template, "drivers-template.csv");
    toast({ title: "Template Downloaded", description: "CSV template with schedule columns (CDL: yes/no)" });
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
            is_active: row.Active?.toLowerCase() !== "no" && row.Active?.toLowerCase() !== "inactive",
            has_cdl: row.CDL?.toLowerCase() === "yes" || row.CDL?.toLowerCase() === "cdl",
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
      is_active: formData.is_active,
      has_cdl: formData.has_cdl,
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
        is_active: formData.is_active,
        has_cdl: formData.has_cdl,
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
      is_active: (driver as any).is_active !== false,
      has_cdl: (driver as any).has_cdl === true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Manage Drivers</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {(cdlFilter !== "all" || activeFilter !== "all" || sortBy !== "name") && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {[cdlFilter !== "all", activeFilter !== "all", sortBy !== "name"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover">
              <DropdownMenuLabel>Filter by CDL</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={cdlFilter} onValueChange={(v) => setCdlFilter(v as typeof cdlFilter)}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="cdl">CDL Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="non-cdl">Non-CDL Only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="cdl">CDL Status</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">Active Status</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {(cdlFilter !== "all" || activeFilter !== "all" || sortBy !== "name") && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    onClick={() => {
                      setCdlFilter("all");
                      setActiveFilter("all");
                      setSortBy("name");
                    }}
                    className="w-full px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors text-left"
                  >
                    Reset all filters
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_cdl">License Type</Label>
                  <Select
                    value={formData.has_cdl ? "cdl" : "non-cdl"}
                    onValueChange={(value) => setFormData({ ...formData, has_cdl: value === "cdl" })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdl">CDL</SelectItem>
                      <SelectItem value="non-cdl">Non-CDL</SelectItem>
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
        CSV format: Name, Code, Phone, Active (yes/no), CDL (yes/no)
      </p>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[1fr_60px_100px_70px_100px_100px] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Code</span>
          <span>Phone</span>
          <span>CDL</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        
        {filteredDrivers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQuery === "" && cdlFilter === "all" && activeFilter === "all" 
              ? "No drivers found. Add your first driver above." 
              : "No drivers match the selected filters."}
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const isInactive = (driver as any).is_active === false;
            return (
            <div
              key={driver.id}
              className={`grid grid-cols-[1fr_60px_100px_70px_100px_100px] gap-4 border-b border-border px-4 py-3 text-sm last:border-0 ${isInactive ? "bg-muted/30 opacity-60" : ""}`}
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
                  <Select
                    value={formData.has_cdl ? "cdl" : "non-cdl"}
                    onValueChange={(value) => setFormData({ ...formData, has_cdl: value === "cdl" })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdl">CDL</SelectItem>
                      <SelectItem value="non-cdl">Non-CDL</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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
                  <span className={`font-medium ${isInactive ? "line-through text-muted-foreground" : ""}`}>{driver.name}</span>
                  <span className={`font-mono text-xs ${isInactive ? "text-muted-foreground" : "text-primary"}`}>{driver.code || "-"}</span>
                  <span className="font-mono text-muted-foreground">{driver.phone || "-"}</span>
                  
                  <Badge variant={(driver as any).has_cdl ? "default" : "outline"} className="text-xs">
                    {(driver as any).has_cdl ? "CDL" : "Non-CDL"}
                  </Badge>
                  <Badge variant={isInactive ? "secondary" : "default"} className="text-xs">
                    {isInactive ? "Inactive" : "Active"}
                  </Badge>
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
          )})
        )}
      </div>
    </div>
  );
}
