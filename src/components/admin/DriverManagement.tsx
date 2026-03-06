import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Download, Upload, Search, SlidersHorizontal, StickyNote, ChevronDown, ChevronRight, ChevronLeft, Home, Phone, User, Circle, UserCheck, UserX, CheckCircle, XCircle, Train, Stethoscope, MoreHorizontal, ExternalLink } from "lucide-react";
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
  DropdownMenuItem,
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
import { ImportPreviewDialog, validateImportRow } from "./ImportPreviewDialog";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

type ScheduleMap = Record<string, Record<number, { is_off: boolean; start_time: string | null; is_any_hours: boolean }>>;

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

interface ScheduleColorConfig {
  veryEarly: { label: string; range: string; color: string };
  earlyMorning: { label: string; range: string; color: string };
  lateMorning: { label: string; range: string; color: string };
  afternoon: { label: string; range: string; color: string };
  evening: { label: string; range: string; color: string };
}

interface DisplayPreferences {
  defaultPageSize: number;
  defaultDriverTab: "cdl" | "non-cdl";
  defaultActiveFilter: "all" | "active" | "inactive";
  showScheduleInTable: boolean;
  showColorLegend: boolean;
  compactMode: boolean;
}

const defaultColors: ScheduleColorConfig = {
  veryEarly: { label: "Very Early", range: "Before 6am", color: "#c084fc" },
  earlyMorning: { label: "Early Morning", range: "6am - 9am", color: "#60a5fa" },
  lateMorning: { label: "Late Morning", range: "9am - 12pm", color: "#34d399" },
  afternoon: { label: "Afternoon", range: "12pm - 5pm", color: "#fbbf24" },
  evening: { label: "Evening", range: "After 5pm", color: "#fb923c" },
};

const defaultDisplayPrefs: DisplayPreferences = {
  defaultPageSize: 10,
  defaultDriverTab: "non-cdl",
  defaultActiveFilter: "active",
  showScheduleInTable: true,
  showColorLegend: true,
  compactMode: false,
};

export function DriverManagement() {
  const { allDrivers: drivers, vehicles } = useDispatchData();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState<ReturnType<typeof validateImportRow>[]>([]);
  const [cdlTab, setCdlTab] = useState<"cdl" | "non-cdl">("non-cdl");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [shuttleFilter, setShuttleFilter] = useState<"all" | "amtrak-primary" | "amtrak-trained" | "bph-primary" | "bph-trained">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [schedules, setSchedules] = useState<ScheduleMap>({});
  const [scheduleColors, setScheduleColors] = useState<ScheduleColorConfig>(defaultColors);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPreferences>(defaultDisplayPrefs);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem("scheduleColors");
    const savedPrefs = localStorage.getItem("displayPreferences");
    
    if (savedColors) {
      try {
        setScheduleColors(JSON.parse(savedColors));
      } catch (e) {
        console.error("Failed to parse saved colors");
      }
    }
    
    if (savedPrefs) {
      try {
        const prefs = { ...defaultDisplayPrefs, ...JSON.parse(savedPrefs) };
        setDisplayPrefs(prefs);
        // Apply saved defaults
        setCdlTab(prefs.defaultDriverTab);
        setActiveFilter(prefs.defaultActiveFilter);
        setPageSize(prefs.defaultPageSize);
      } catch (e) {
        console.error("Failed to parse saved preferences");
      }
    }
    setPrefsLoaded(true);
  }, []);

  // Listen for settings changes via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "scheduleColors" && e.newValue) {
        try {
          setScheduleColors(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to parse updated colors");
        }
      }
      if (e.key === "displayPreferences" && e.newValue) {
        try {
          setDisplayPrefs({ ...defaultDisplayPrefs, ...JSON.parse(e.newValue) });
        } catch (err) {
          console.error("Failed to parse updated preferences");
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch all driver schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      const { data } = await supabase.from("driver_schedules").select("*");
      if (data) {
        const map: ScheduleMap = {};
        data.forEach((s) => {
          if (!map[s.driver_id]) map[s.driver_id] = {};
          map[s.driver_id][s.day_of_week] = {
            is_off: s.is_off,
            start_time: s.start_time,
            is_any_hours: (s as any).is_any_hours || false,
          };
        });
        setSchedules(map);
      }
    };
    fetchSchedules();
  }, [drivers]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDrivers = drivers
    .filter((driver) => {
      const matchesSearch = searchQuery === "" || 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (driver.code?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCdl = cdlTab === "cdl" ? (driver as any).has_cdl === true : (driver as any).has_cdl !== true;
      const matchesActive = activeFilter === "all" || 
        (activeFilter === "active" ? (driver as any).is_active !== false : (driver as any).is_active === false);
      
      // Shuttle filter
      let matchesShuttle = true;
      if (shuttleFilter === "amtrak-primary") matchesShuttle = (driver as any).amtrak_primary === true;
      else if (shuttleFilter === "amtrak-trained") matchesShuttle = (driver as any).amtrak_trained === true;
      else if (shuttleFilter === "bph-primary") matchesShuttle = (driver as any).bph_primary === true;
      else if (shuttleFilter === "bph-trained") matchesShuttle = (driver as any).bph_trained === true;
      
      return matchesSearch && matchesCdl && matchesActive && matchesShuttle;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        // Extract last name (last word in the name) for sorting
        const getLastName = (name: string) => {
          const parts = name.trim().split(/\s+/);
          return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : "";
        };
        const aLastName = getLastName(a.name);
        const bLastName = getLastName(b.name);
        return aLastName.localeCompare(bLastName);
      }
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
    const template = "Name,Code,Phone,Email,Address,Active,CDL,Amtrak_Primary,Amtrak_Trained,BPH_Primary,BPH_Trained,Emergency1_Name,Emergency1_Phone,Emergency1_Relationship,Emergency2_Name,Emergency2_Phone,Emergency2_Relationship,Mon_In,Mon_Out,Tue_In,Tue_Out,Wed_In,Wed_Out,Thu_In,Thu_Out,Fri_In,Fri_Out,Sat_In,Sat_Out,Sun_In,Sun_Out\nJohn Doe,JDOE,555-0123,john@example.com,123 Main St,yes,yes,no,no,no,no,Jane Doe,555-0199,Spouse,Bob Smith,555-0188,Brother,08:00,17:00,ANY,,08:00,17:00,08:00,17:00,08:00,17:00,OFF,,OFF,";
    downloadCSV(template, "drivers-template.csv");
    toast({ title: "Template Downloaded", description: "Use ANY for open availability, OFF for days off, HH:MM times. Shuttle columns: yes/no" });
  };

  const dayMapping: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV<Record<string, string>>(text);

      if (rows.length === 0) {
        toast({ title: "Error", description: "No valid data found in CSV", variant: "destructive" });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validate each row and open preview dialog
      const validatedRows = rows.map((row, index) => validateImportRow(row, index + 1));
      setParsedImportRows(validatedRows);
      setImportPreviewOpen(true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to parse CSV file", variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async (validRows: typeof parsedImportRows) => {
    setImporting(true);
    let driversImported = 0;
    let schedulesImported = 0;

    try {
      for (const { data: row } of validRows) {
        // Insert driver with all fields including emergency contacts (without vehicle fields)
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .insert({
            name: row.Name.trim(),
            code: row.Code?.trim().toUpperCase().slice(0, 4) || null,
            phone: row.Phone?.trim() || null,
            email: row.Email?.trim() || null,
            address: row.Address?.trim() || null,
            is_active: row.Active?.toLowerCase() !== "no" && row.Active?.toLowerCase() !== "inactive",
            has_cdl: row.CDL?.toLowerCase() === "yes" || row.CDL?.toLowerCase() === "cdl",
            amtrak_primary: row.Amtrak_Primary?.toLowerCase() === "yes",
            amtrak_trained: row.Amtrak_Trained?.toLowerCase() === "yes",
            bph_primary: row.BPH_Primary?.toLowerCase() === "yes",
            bph_trained: row.BPH_Trained?.toLowerCase() === "yes",
            emergency_contact_name: row.Emergency1_Name?.trim() || null,
            emergency_contact_phone: row.Emergency1_Phone?.trim() || null,
            emergency_contact_relationship: row.Emergency1_Relationship?.trim() || null,
            emergency_contact_name_2: row.Emergency2_Name?.trim() || null,
            emergency_contact_phone_2: row.Emergency2_Phone?.trim() || null,
            emergency_contact_relationship_2: row.Emergency2_Relationship?.trim() || null,
          } as any)
          .select("id")
          .single();

        if (driverError || !driverData) {
          console.error("Failed to import driver:", row.Name, driverError);
          continue;
        }

        driversImported++;

        // Parse and insert schedules (supports ANY, OFF, or HH:MM)
        const scheduleInserts = [];
        for (const [dayAbbrev, dayNum] of Object.entries(dayMapping)) {
          const inTime = row[`${dayAbbrev}_In`]?.trim();
          const outTime = row[`${dayAbbrev}_Out`]?.trim();

          if (inTime) {
            const isOff = inTime.toUpperCase() === "OFF";
            const isAny = inTime.toUpperCase() === "ANY";
            scheduleInserts.push({
              driver_id: driverData.id,
              day_of_week: dayNum,
              is_off: isOff,
              is_any_hours: isAny,
              start_time: isOff ? null : (isAny ? "00:00" : inTime),
              end_time: isOff ? null : (isAny ? "23:59" : (outTime || null)),
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
        toast({ title: "Error", description: "No drivers were imported", variant: "destructive" });
      } else {
        toast({ 
          title: "Success", 
          description: `${driversImported} drivers imported${schedulesImported > 0 ? ` with ${schedulesImported} schedule entries` : ""}` 
        });
        setImportPreviewOpen(false);
        setParsedImportRows([]);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to import drivers", variant: "destructive" });
    } finally {
      setImporting(false);
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

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase
      .from("drivers")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({ title: "Error", description: "Failed to delete drivers", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.size} driver(s) deleted` });
      setSelectedIds(new Set());
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
      toast({ title: "Success", description: `${selectedIds.size} driver(s) set to ${isActive ? "active" : "inactive"}` });
      setSelectedIds(new Set());
    }
  };


  const toggleDriverActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from("drivers")
      .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update driver status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Driver marked as ${!currentlyActive ? "active" : "inactive"}` });
    }
  };

  const cdlCount = drivers.filter(d => (d as any).has_cdl === true).length;
  const nonCdlCount = drivers.filter(d => (d as any).has_cdl !== true).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Drivers</h2>
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
                Export Drivers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importing..." : "Import Drivers"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button size="sm" className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or code..."
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
              {(activeFilter !== "all" || sortBy !== "name" || shuttleFilter !== "all") && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {[activeFilter !== "all", sortBy !== "name", shuttleFilter !== "all"].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={activeFilter} onValueChange={(v) => { setActiveFilter(v as typeof activeFilter); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Shuttle</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={shuttleFilter} onValueChange={(v) => { setShuttleFilter(v as typeof shuttleFilter); setCurrentPage(1); }}>
              <DropdownMenuRadioItem value="all">All Drivers</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="amtrak-primary">
                <Train className="h-3 w-3 mr-1.5 text-blue-500" />
                Amtrak – Primary
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="amtrak-trained">
                <Train className="h-3 w-3 mr-1.5 text-blue-400" />
                Amtrak – Trained
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bph-primary">
                <Stethoscope className="h-3 w-3 mr-1.5 text-green-500" />
                BPH – Primary
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bph-trained">
                <Stethoscope className="h-3 w-3 mr-1.5 text-green-400" />
                BPH – Trained
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status">Active Status</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {(activeFilter !== "all" || sortBy !== "name" || shuttleFilter !== "all") && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => {
                    setActiveFilter("all");
                    setSortBy("name");
                    setShuttleFilter("all");
                  }}
                  className="w-full px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors text-left"
                >
                  Reset all filters
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredDrivers.length} of {drivers.length} drivers
        </span>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Set Active
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)}>
            <XCircle className="h-4 w-4 mr-1" />
            Set Inactive
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
                <AlertDialogTitle>Delete {selectedIds.size} driver(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected drivers.
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

      <Tabs value={cdlTab} onValueChange={(v) => { setCdlTab(v as "cdl" | "non-cdl"); setCurrentPage(1); }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="non-cdl" className="gap-2">
                Non-CDL Drivers
                <Badge variant="secondary" className="text-xs">{nonCdlCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cdl" className="gap-2">
                CDL Drivers
                <Badge variant="secondary" className="text-xs">{cdlCount}</Badge>
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
        </div>

        {/* Schedule Color Legend */}
        {displayPrefs.showColorLegend && displayPrefs.showScheduleInTable && (
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="font-medium">Schedule:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduleColors.veryEarly.color }}></span>
              <span>&lt;6am</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduleColors.earlyMorning.color }}></span>
              <span>6-9am</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduleColors.lateMorning.color }}></span>
              <span>9am-12pm</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduleColors.afternoon.color }}></span>
              <span>12-5pm</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheduleColors.evening.color }}></span>
              <span>5pm+</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/50">OFF</span>
            </div>
          </div>
        )}

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


      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        open={importPreviewOpen}
        onOpenChange={(open) => {
          setImportPreviewOpen(open);
          if (!open) setParsedImportRows([]);
        }}
        parsedRows={parsedImportRows}
        onConfirmImport={handleConfirmImport}
        importing={importing}
      />
    </div>
  );

  function renderDriverTable() {
    const formatTime = (time: string | null) => {
      if (!time) return "-";
      const [h, m] = time.split(":");
      const hour = parseInt(h, 10);
      return `${hour > 12 ? hour - 12 : hour}${m !== "00" ? `:${m}` : ""}${hour >= 12 ? "p" : "a"}`;
    };

    const getTimeColor = (time: string | null, isOff: boolean): string | undefined => {
      if (isOff || !time) return undefined;
      const hour = parseInt(time.split(":")[0], 10);
      if (hour < 6) return scheduleColors.veryEarly.color;
      if (hour < 9) return scheduleColors.earlyMorning.color;
      if (hour < 12) return scheduleColors.lateMorning.color;
      if (hour < 17) return scheduleColors.afternoon.color;
      return scheduleColors.evening.color;
    };

    const gridCols = displayPrefs.showScheduleInTable
      ? "grid-cols-[32px_24px_minmax(140px,1fr)_repeat(7,32px)_60px_80px]"
      : "grid-cols-[32px_24px_minmax(200px,1fr)_80px_80px]";

    const rowPadding = displayPrefs.compactMode ? "py-1" : "py-2";

    const allCurrentPageSelected = paginatedDrivers.length > 0 && paginatedDrivers.every(d => selectedIds.has(d.id));

    return (
      <div className="rounded-lg border border-border bg-card">
        <div className={`grid ${gridCols} gap-2 border-b border-border bg-secondary/50 px-4 ${rowPadding} text-xs font-medium uppercase text-muted-foreground items-center`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <Checkbox
                  checked={allCurrentPageSelected}
                  className="pointer-events-none"
                  aria-label="Select all"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover">
              <DropdownMenuLabel>Select</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value=""
                onValueChange={(val) => {
                  if (val === "page") {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      paginatedDrivers.forEach((d) => next.add(d.id));
                      return next;
                    });
                  } else if (val === "all") {
                    setSelectedIds(new Set(filteredDrivers.map((d) => d.id)));
                  } else if (val === "none") {
                    setSelectedIds(new Set());
                  }
                }}
              >
                <DropdownMenuRadioItem value="page">This Page</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="all">All ({filteredDrivers.length})</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span></span>
          <span>Name</span>
          {displayPrefs.showScheduleInTable && DAY_LABELS.map((d, i) => (
            <span key={i} className="text-center text-[10px]">{d}</span>
          ))}
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
            const driverSchedule = schedules[driver.id] || {};
            return (
              <div key={driver.id} className="border-b border-border last:border-0">
                <div
                  className={`grid ${gridCols} gap-2 px-4 ${rowPadding} text-sm items-center ${isInactive ? "bg-muted/30" : ""} ${selectedIds.has(driver.id) ? "bg-primary/5" : ""}`}
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
                  {/* Weekly Schedule */}
                  {displayPrefs.showScheduleInTable && DAY_ORDER.map((dayNum, idx) => {
                    const dayData = driverSchedule[dayNum];
                    const isOff = dayData?.is_off || !dayData;
                    const isAny = dayData?.is_any_hours && !isOff;
                    const time = isOff ? null : dayData?.start_time;
                    const color = getTimeColor(time, isOff);
                    
                    return (
                      <span 
                        key={idx} 
                        className="text-center text-[10px] font-mono"
                        style={color && !isAny ? { color } : undefined}
                        title={isAny ? "Open to any shift" : undefined}
                      >
                        {isOff ? (
                          <span className="text-muted-foreground/50">OFF</span>
                        ) : isAny ? (
                          <span className="text-cyan-500">Any</span>
                        ) : (
                          formatTime(time)
                        )}
                      </span>
                    );
                  })}
                  <span className={`font-mono text-xs ${isInactive ? "text-muted-foreground" : "text-primary"}`}>{driver.code || "-"}</span>
                  <div className="flex justify-end gap-1">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={`h-8 w-8 ${isInactive ? "text-green-600 hover:text-green-600" : "text-muted-foreground hover:text-muted-foreground"}`}
                            onClick={() => toggleDriverActive(driver.id, !isInactive)}
                          >
                            {isInactive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span>{isInactive ? "Set Active" : "Set Inactive"}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Link to={`/admin/driver/${driver.id}`}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" title="View Profile">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
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
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {(driver as any).amtrak_primary && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                              <Train className="h-3 w-3 mr-0.5" />
                              AMTRAK Primary
                            </Badge>
                          )}
                          {(driver as any).amtrak_trained && !(driver as any).amtrak_primary && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-100 text-blue-500 border-blue-300">
                              <Train className="h-3 w-3 mr-0.5" />
                              AMTRAK Trained
                            </Badge>
                          )}
                          {(driver as any).bph_primary && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                              <Stethoscope className="h-3 w-3 mr-0.5" />
                              BPH Primary
                            </Badge>
                          )}
                          {(driver as any).bph_trained && !(driver as any).bph_primary && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-100 text-green-500 border-green-300">
                              <Stethoscope className="h-3 w-3 mr-0.5" />
                              BPH Trained
                            </Badge>
                          )}
                          {(driver as any).default_vehicle && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/30">
                              <Home className="h-3 w-3 mr-0.5" />
                              Take Home: {(driver as any).default_vehicle}
                            </Badge>
                          )}
                          {driver.phone && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Phone className="h-3 w-3" />
                              {driver.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1 bg-secondary/30 rounded-md px-3 py-2">
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
