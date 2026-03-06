import { useState } from "react";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { CalendarOff, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDispatchData } from "@/hooks/useDispatchData";
import { useDriverTimeOff, type DriverTimeOff } from "@/hooks/useDriverTimeOff";

const TIME_OFF_LABELS: Record<DriverTimeOff["time_off_type"], string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
  fmla: "FMLA",
};

const STATUS_COLORS: Record<DriverTimeOff["status"], string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const TYPE_COLORS: Record<DriverTimeOff["time_off_type"], string> = {
  vacation: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  sick: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  personal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  fmla: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function TimeOffManagement() {
  const { drivers } = useDispatchData();
  const { timeOffEntries, isLoading, addTimeOff, updateTimeOff, deleteTimeOff } = useDriverTimeOff();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [formDriverId, setFormDriverId] = useState("");
  const [formType, setFormType] = useState<DriverTimeOff["time_off_type"]>("vacation");
  const [formStartDate, setFormStartDate] = useState<Date | undefined>();
  const [formEndDate, setFormEndDate] = useState<Date | undefined>();
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormDriverId("");
    setFormType("vacation");
    setFormStartDate(undefined);
    setFormEndDate(undefined);
    setFormNotes("");
  };

  const handleAdd = async () => {
    if (!formDriverId || !formStartDate || !formEndDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (isAfter(formStartDate, formEndDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }

    const driver = drivers.find((d) => d.id === formDriverId);
    if (!driver) return;

    try {
      await addTimeOff.mutateAsync({
        driver_id: formDriverId,
        driver_name: driver.name,
        time_off_type: formType,
        start_date: format(formStartDate, "yyyy-MM-dd"),
        end_date: format(formEndDate, "yyyy-MM-dd"),
        notes: formNotes || undefined,
      });
      toast({ title: "Success", description: "Time off entry added" });
      setIsAddOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to add time off entry", variant: "destructive" });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateTimeOff.mutateAsync({ id, status: "cancelled" });
      toast({ title: "Success", description: "Time off cancelled" });
    } catch {
      toast({ title: "Error", description: "Failed to cancel time off", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeOff.mutateAsync(id);
      toast({ title: "Success", description: "Time off entry deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    }
  };

  // Compute display status based on dates
  const getDisplayStatus = (entry: DriverTimeOff): DriverTimeOff["status"] => {
    if (entry.status === "cancelled") return "cancelled";
    const today = new Date();
    const start = parseISO(entry.start_date);
    const end = parseISO(entry.end_date);
    if (isBefore(end, today) && !isToday(end)) return "completed";
    if ((isAfter(today, start) || isToday(start)) && (isBefore(today, end) || isToday(end))) return "active";
    return "scheduled";
  };

  // Filter entries
  const filtered = timeOffEntries.filter((entry) => {
    const displayStatus = getDisplayStatus(entry);
    if (filterStatus !== "all" && displayStatus !== filterStatus) return false;
    if (filterType !== "all" && entry.time_off_type !== filterType) return false;
    if (search && !entry.driver_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedDrivers = [...drivers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Time Off Log
        </h2>
        <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Time Off
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="sick">Sick</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="fmla">FMLA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No time off entries found
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2 font-medium">Driver</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Start</th>
                <th className="text-left px-4 py-2 font-medium">End</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Notes</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((entry) => {
                const displayStatus = getDisplayStatus(entry);
                return (
                  <tr key={entry.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium">{entry.driver_name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[entry.time_off_type])}>
                        {TIME_OFF_LABELS[entry.time_off_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">{format(parseISO(entry.start_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-2.5">{format(parseISO(entry.end_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[displayStatus])}>
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {entry.notes || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {displayStatus === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-400 hover:text-amber-300"
                            onClick={() => handleCancel(entry.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Driver</Label>
              <Select value={formDriverId} onValueChange={setFormDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as DriverTimeOff["time_off_type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="fmla">FMLA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formStartDate && "text-muted-foreground")}>
                      {formStartDate ? format(formStartDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formStartDate}
                      onSelect={(d) => {
                        setFormStartDate(d);
                        if (!formEndDate && d) setFormEndDate(d);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formEndDate && "text-muted-foreground")}>
                      {formEndDate ? format(formEndDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formEndDate}
                      onSelect={setFormEndDate}
                      disabled={(date) => formStartDate ? isBefore(date, formStartDate) : false}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>

            <Button onClick={handleAdd} className="w-full" disabled={addTimeOff.isPending}>
              {addTimeOff.isPending ? "Adding..." : "Add Time Off"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
