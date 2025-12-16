import { useState, useEffect } from "react";
import { Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDispatchData } from "@/hooks/useDispatchData";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

interface Schedule {
  id: string;
  driver_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
}

interface ScheduleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_off: boolean;
}

const initialFormData: ScheduleFormData = {
  day_of_week: 1,
  start_time: "08:00",
  end_time: "17:00",
  is_off: false,
};

export function ScheduleManagement() {
  const { drivers } = useDispatchData();
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);

  useEffect(() => {
    if (selectedDriverId) {
      fetchSchedules(selectedDriverId);
    } else {
      setSchedules([]);
    }
  }, [selectedDriverId]);

  const fetchSchedules = async (driverId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_schedules")
      .select("*")
      .eq("driver_id", driverId)
      .order("day_of_week");

    if (error) {
      toast({ title: "Error", description: "Failed to load schedules", variant: "destructive" });
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  const getScheduleForDay = (day: number) => {
    return schedules.find(s => s.day_of_week === day);
  };

  const openEditDialog = (day: number) => {
    const existing = getScheduleForDay(day);
    if (existing) {
      setFormData({
        day_of_week: day,
        start_time: existing.start_time || "08:00",
        end_time: existing.end_time || "17:00",
        is_off: existing.is_off,
      });
    } else {
      setFormData({ ...initialFormData, day_of_week: day });
    }
    setEditingDay(day);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDriverId) return;

    const existing = getScheduleForDay(formData.day_of_week);
    
    const scheduleData = {
      driver_id: selectedDriverId,
      day_of_week: formData.day_of_week,
      start_time: formData.is_off ? null : formData.start_time,
      end_time: formData.is_off ? null : formData.end_time,
      is_off: formData.is_off,
    };

    let error;
    if (existing) {
      const result = await supabase
        .from("driver_schedules")
        .update(scheduleData)
        .eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("driver_schedules")
        .insert(scheduleData);
      error = result.error;
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save schedule", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Schedule updated" });
      fetchSchedules(selectedDriverId);
      setIsEditOpen(false);
    }
  };

  const handleClearDay = async (day: number) => {
    const existing = getScheduleForDay(day);
    if (!existing) return;

    const { error } = await supabase
      .from("driver_schedules")
      .delete()
      .eq("id", existing.id);

    if (error) {
      toast({ title: "Error", description: "Failed to clear schedule", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Schedule cleared" });
      if (selectedDriverId) fetchSchedules(selectedDriverId);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Schedules
        </h2>
      </div>

      <div className="space-y-2">
        <Label>Select Driver</Label>
        <Select value={selectedDriverId || ""} onValueChange={setSelectedDriverId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Choose a driver..." />
          </SelectTrigger>
          <SelectContent>
            {drivers.map(driver => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDriverId && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-3">
            <h3 className="font-medium">{selectedDriver?.name}'s Weekly Schedule</h3>
            <p className="text-xs text-muted-foreground mt-1">Click a day to set or edit the schedule</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {DAYS_OF_WEEK.map(day => {
                const schedule = getScheduleForDay(day.value);
                return (
                  <div
                    key={day.value}
                    className="grid grid-cols-[100px_1fr_80px] items-center gap-4 px-4 py-3"
                  >
                    <span className="font-medium">{day.label}</span>
                    <div className="flex items-center gap-2 text-sm">
                      {schedule ? (
                        schedule.is_off ? (
                          <span className="text-muted-foreground italic">Day Off</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(day.value)}
                      >
                        Edit
                      </Button>
                      {schedule && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleClearDay(day.value)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {DAYS_OF_WEEK.find(d => d.value === editingDay)?.label} Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_off">Day Off</Label>
              <Switch
                id="is_off"
                checked={formData.is_off}
                onCheckedChange={(checked) => setFormData({ ...formData, is_off: checked })}
              />
            </div>

            {!formData.is_off && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </>
            )}

            <Button onClick={handleSave} className="w-full">Save Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
