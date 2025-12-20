import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Download, Upload, Search, SlidersHorizontal, StickyNote, ChevronDown, ChevronRight, ChevronLeft, UserCheck, UserX, Home, Phone, User, Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";
import { parseCSV, generateCSV, downloadCSV } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DriverProfileDialog } from "./DriverProfileDialog";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

export function DriverManagement() {
  const { allDrivers: drivers, vehicles } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [importing, setImporting] = useState(false);
  const [cdlTab, setCdlTab] = useState<"cdl" | "non-cdl">("cdl");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditNotes = (driverId: string, currentNotes: string) => {
    setEditingNotesId(driverId);
    setEditingNotesValue(currentNotes || "");
  };

  const cancelEditNotes = () => {
    setEditingNotesId(null);
    setEditingNotesValue("");
  };

  const saveNotes = async (driverId: string) => {
    const { error } = await supabase
      .from("drivers")
      .update({ notes: editingNotesValue.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", driverId);

    if (error) {
      toast({ title: "Error", description: "Failed to update notes", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Notes updated" });
      setEditingNotesId(null);
      setEditingNotesValue("");
    }
  };

  const toggleSelectDriver = (id: string) => {
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDrivers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrivers.map((d) => d.id)));
    }
  };

  const bulkSetActive = async (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase
      .from("drivers")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({ title: "Error", description: "Failed to update drivers", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.size} driver(s) marked as ${isActive ? "active" : "inactive"}` });
      setSelectedIds(new Set());
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDrivers = drivers
    .filter((driver) => {
      const matchesSearch = searchQuery === "" || 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (driver.code?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCdl = cdlTab === "cdl" ? (driver as any).has_cdl === true : (driver as any).has_cdl !== true;
      const matchesActive = activeFilter === "all" || 
        (activeFilter === "active" ? (driver as any).is_active !== false : (driver as any).is_active === false);
      return matchesSearch && matchesCdl && matchesActive;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status") {
        const aActive = (a as any).is_active !== false ? 1 : 0;
        const bActive = (b as any).is_active !== false ? 1 : 0;
        return bActive - aActive; // Active first
      }
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDrivers = filteredDrivers.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1);
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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("drivers").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete driver", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Driver deleted successfully" });
    }
  };

  const openEditProfile = (driver: DriverRow) => {
    setEditingDriver(driver);
  };

  const cdlCount = drivers.filter(d => (d as any).has_cdl === true).length;
  const nonCdlCount = drivers.filter(d => (d as any).has_cdl !== true).length;

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
                {(activeFilter !== "all" || sortBy !== "name") && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {[activeFilter !== "all", sortBy !== "name"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover">
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
                <DropdownMenuRadioItem value="status">Active Status</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {(activeFilter !== "all" || sortBy !== "name") && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    onClick={() => {
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
          <Button size="sm" className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Driver
          </Button>
        </div>
      </div>

      <Tabs value={cdlTab} onValueChange={(v) => { setCdlTab(v as "cdl" | "non-cdl"); setCurrentPage(1); }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="cdl" className="gap-2">
                CDL Drivers
                <Badge variant="secondary" className="text-xs">{cdlCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="non-cdl" className="gap-2">
                Non-CDL Drivers
                <Badge variant="secondary" className="text-xs">{nonCdlCount}</Badge>
              </TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => {
                setActiveFilter(activeFilter === "all" ? "active" : "all");
                setCurrentPage(1);
              }}
              className="gap-1.5"
            >
              <User className="h-4 w-4" />
              All Drivers
            </Button>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)}>
                <UserCheck className="h-4 w-4 mr-1" />
                Set Active
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)}>
                <UserX className="h-4 w-4 mr-1" />
                Set Inactive
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="cdl" className="mt-4">
          {renderDriverTable()}
        </TabsContent>
        <TabsContent value="non-cdl" className="mt-4">
          {renderDriverTable()}
        </TabsContent>
      </Tabs>

      {/* Driver Profile Dialog - Add Mode */}
      <DriverProfileDialog
        driver={null}
        vehicles={vehicles}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        mode="add"
      />

      {/* Driver Profile Dialog - Edit Mode */}
      <DriverProfileDialog
        driver={editingDriver}
        vehicles={vehicles}
        open={editingDriver !== null}
        onOpenChange={(open) => !open && setEditingDriver(null)}
        mode="edit"
      />
    </div>
  );

  function renderDriverTable() {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[32px_24px_1fr_80px_100px] gap-4 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-medium uppercase text-muted-foreground items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <Checkbox
                  checked={filteredDrivers.length > 0 && selectedIds.size === filteredDrivers.length}
                  className="pointer-events-none"
                  aria-label="Select all"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Selection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value="">
                <DropdownMenuRadioItem value="all-page" onClick={() => setSelectedIds(new Set(paginatedDrivers.map((d) => d.id)))}>
                  Select page ({paginatedDrivers.length})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all-filtered" onClick={() => setSelectedIds(new Set(filteredDrivers.map((d) => d.id)))}>
                  Select all filtered ({filteredDrivers.length})
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all-drivers" onClick={() => setSelectedIds(new Set(drivers.map((d) => d.id)))}>
                  Select all drivers ({drivers.length})
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="none" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span></span>
          <span>Name</span>
          <span>Code</span>
          <span className="text-right">Actions</span>
        </div>
        
        {filteredDrivers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQuery === "" && activeFilter === "all" 
              ? `No ${cdlTab === "cdl" ? "CDL" : "Non-CDL"} drivers found. Add your first driver above.` 
              : "No drivers match the selected filters."}
          </div>
        ) : (
          paginatedDrivers.map((driver) => {
            const isInactive = (driver as any).is_active === false;
            const hasNotes = !!(driver as any).notes;
            const isExpanded = expandedIds.has(driver.id);
            return (
              <div key={driver.id} className="border-b border-border last:border-0">
                <div
                  className={`grid grid-cols-[32px_24px_1fr_80px_100px] gap-4 px-4 py-3 text-sm items-center ${isInactive ? "bg-muted/30" : ""}`}
                >
                  <Checkbox
                    checked={selectedIds.has(driver.id)}
                    onCheckedChange={() => toggleSelectDriver(driver.id)}
                    aria-label={`Select ${driver.name}`}
                  />
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Circle 
                          className={`h-3 w-3 ${isInactive ? "text-muted-foreground/40" : "text-green-500 fill-green-500"}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>{isInactive ? "Inactive" : "Active"}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={1000}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`font-medium flex items-center gap-1.5 cursor-default ${isInactive ? "line-through text-muted-foreground" : ""}`}>
                          <button
                            onClick={() => toggleExpand(driver.id)}
                            className="p-0.5 -ml-1 hover:bg-secondary rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          {driver.name}
                          {(driver as any).default_vehicle && (
                            <span title={`Take-home: ${(driver as any).default_vehicle}`}>
                              <Home className="h-3.5 w-3.5 text-primary" />
                            </span>
                          )}
                          {hasNotes && (
                            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3">
                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="font-semibold text-foreground">{driver.name}</div>
                          {driver.code && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="font-mono">{driver.code}</span>
                            </div>
                          )}
                          {driver.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">{driver.phone}</span>
                            </div>
                          )}
                          {!driver.code && !driver.phone && (
                            <span className="text-muted-foreground italic">No contact info</span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`font-mono text-xs ${isInactive ? "text-muted-foreground" : "text-primary"}`}>{driver.code || "-"}</span>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditProfile(driver as DriverRow)}>
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
                </div>
                {/* Expanded notes section */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
                    {editingNotesId === driver.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingNotesValue}
                          onChange={(e) => setEditingNotesValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              cancelEditNotes();
                            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              saveNotes(driver.id);
                            }
                          }}
                          placeholder="Add notes..."
                          rows={3}
                          className="text-sm"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Esc to cancel • Ctrl+Enter to save</p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveNotes(driver.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditNotes}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                          {hasNotes ? (driver as any).notes : <span className="italic">No notes</span>}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => startEditNotes(driver.id, (driver as any).notes || "")}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* Pagination Controls */}
        {filteredDrivers.length > 0 && (
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
                {startIndex + 1}-{Math.min(startIndex + pageSize, filteredDrivers.length)} of {filteredDrivers.length}
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
    );
  }
}
