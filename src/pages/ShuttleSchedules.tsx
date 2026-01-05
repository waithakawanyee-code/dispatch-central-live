import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Train, Stethoscope, Save, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  name: string;
  amtrak_trained: boolean;
  amtrak_primary: boolean;
  bph_trained: boolean;
  bph_primary: boolean;
  is_active: boolean;
}

interface ShuttleSchedule {
  id: string;
  driver_id: string;
  program: string;
  day_of_week: number;
  shift_number: number;
  start_time: string | null;
  end_time: string | null;
}

const AMTRAK_SHIFTS = [
  { number: 1, label: "Shift 1", defaultStart: "03:00", defaultEnd: "11:00" },
  { number: 2, label: "Shift 2", defaultStart: "11:00", defaultEnd: "19:00" },
  { number: 3, label: "Shift 3", defaultStart: "19:00", defaultEnd: "03:00" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

// BPH is Mon-Fri (days 1-5)
const BPH_DAYS = DAYS_OF_WEEK.filter(d => d.value >= 1 && d.value <= 5);
// Amtrak is Mon-Sun (all days)
const AMTRAK_DAYS = DAYS_OF_WEEK;

const ShuttleSchedules = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [schedules, setSchedules] = useState<ShuttleSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"amtrak" | "bph">("amtrak");

  // Local state for editing
  const [amtrakSchedule, setAmtrakSchedule] = useState<Record<string, string | null>>({});
  const [bphSchedule, setBphSchedule] = useState<Record<string, { driverId: string | null; startTime: string; endTime: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [driversRes, schedulesRes] = await Promise.all([
      supabase.from("drivers").select("id, name, amtrak_trained, amtrak_primary, bph_trained, bph_primary, is_active").eq("is_active", true).order("name"),
      supabase.from("shuttle_schedules").select("*"),
    ]);

    if (driversRes.data) setDrivers(driversRes.data);
    if (schedulesRes.data) {
      setSchedules(schedulesRes.data);
      initializeLocalState(schedulesRes.data);
    }
    setLoading(false);
  };

  const initializeLocalState = (scheduleData: ShuttleSchedule[]) => {
    // Initialize Amtrak schedule state
    const amtrakState: Record<string, string | null> = {};
    AMTRAK_DAYS.forEach(day => {
      AMTRAK_SHIFTS.forEach(shift => {
        const key = `${day.value}-${shift.number}`;
        const existing = scheduleData.find(
          s => s.program === "amtrak" && s.day_of_week === day.value && s.shift_number === shift.number
        );
        amtrakState[key] = existing?.driver_id || null;
      });
    });
    setAmtrakSchedule(amtrakState);

    // Initialize BPH schedule state
    const bphState: Record<string, { driverId: string | null; startTime: string; endTime: string }> = {};
    BPH_DAYS.forEach(day => {
      const existing = scheduleData.find(s => s.program === "bph" && s.day_of_week === day.value);
      bphState[day.value.toString()] = {
        driverId: existing?.driver_id || null,
        startTime: existing?.start_time || "08:00",
        endTime: existing?.end_time || "16:00",
      };
    });
    setBphSchedule(bphState);
  };

  const handleAmtrakChange = (dayOfWeek: number, shiftNumber: number, driverId: string | null) => {
    const key = `${dayOfWeek}-${shiftNumber}`;
    setAmtrakSchedule(prev => ({ ...prev, [key]: driverId }));
  };

  const handleBphChange = (dayOfWeek: number, field: "driverId" | "startTime" | "endTime", value: string | null) => {
    const key = dayOfWeek.toString();
    setBphSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const saveAmtrakSchedules = async () => {
    setSaving(true);
    try {
      // Delete all existing Amtrak schedules
      await supabase.from("shuttle_schedules").delete().eq("program", "amtrak");

      // Insert new schedules
      const inserts: Omit<ShuttleSchedule, "id">[] = [];
      Object.entries(amtrakSchedule).forEach(([key, driverId]) => {
        if (driverId) {
          const [dayStr, shiftStr] = key.split("-");
          const dayOfWeek = parseInt(dayStr);
          const shiftNumber = parseInt(shiftStr);
          const shift = AMTRAK_SHIFTS.find(s => s.number === shiftNumber);
          inserts.push({
            driver_id: driverId,
            program: "amtrak",
            day_of_week: dayOfWeek,
            shift_number: shiftNumber,
            start_time: shift?.defaultStart || null,
            end_time: shift?.defaultEnd || null,
          });
        }
      });

      if (inserts.length > 0) {
        const { error } = await supabase.from("shuttle_schedules").insert(inserts);
        if (error) throw error;
      }

      toast.success("Amtrak schedule saved");
      fetchData();
    } catch (error) {
      toast.error("Failed to save Amtrak schedule");
    } finally {
      setSaving(false);
    }
  };

  const saveBphSchedules = async () => {
    setSaving(true);
    try {
      // Delete all existing BPH schedules
      await supabase.from("shuttle_schedules").delete().eq("program", "bph");

      // Insert new schedules
      const inserts: Omit<ShuttleSchedule, "id">[] = [];
      Object.entries(bphSchedule).forEach(([dayStr, data]) => {
        if (data.driverId) {
          inserts.push({
            driver_id: data.driverId,
            program: "bph",
            day_of_week: parseInt(dayStr),
            shift_number: 1,
            start_time: data.startTime || null,
            end_time: data.endTime || null,
          });
        }
      });

      if (inserts.length > 0) {
        const { error } = await supabase.from("shuttle_schedules").insert(inserts);
        if (error) throw error;
      }

      toast.success("BPH schedule saved");
      fetchData();
    } catch (error) {
      toast.error("Failed to save BPH schedule");
    } finally {
      setSaving(false);
    }
  };

  const amtrakDrivers = drivers.filter(d => d.amtrak_trained || d.amtrak_primary);
  const bphDrivers = drivers.filter(d => d.bph_trained || d.bph_primary);

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return null;
    return drivers.find(d => d.id === driverId)?.name || "Unknown";
  };

  const getDriverBadge = (driverId: string | null, program: "amtrak" | "bph") => {
    if (!driverId) return null;
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return null;
    
    if (program === "amtrak" && driver.amtrak_primary) {
      return <Badge variant="default" className="ml-2 text-xs">Primary</Badge>;
    }
    if (program === "bph" && driver.bph_primary) {
      return <Badge variant="default" className="ml-2 text-xs">Primary</Badge>;
    }
    return <Badge variant="outline" className="ml-2 text-xs">Trained</Badge>;
  };

  // Check for gaps in schedule
  const getAmtrakGaps = () => {
    const gaps: { day: string; shift: string }[] = [];
    AMTRAK_DAYS.forEach(day => {
      AMTRAK_SHIFTS.forEach(shift => {
        const key = `${day.value}-${shift.number}`;
        if (!amtrakSchedule[key]) {
          gaps.push({ day: day.label, shift: shift.label });
        }
      });
    });
    return gaps;
  };

  const getBphGaps = () => {
    const gaps: string[] = [];
    BPH_DAYS.forEach(day => {
      if (!bphSchedule[day.value.toString()]?.driverId) {
        gaps.push(day.label);
      }
    });
    return gaps;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/scheduler">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-foreground">Shuttle Schedules</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "amtrak" | "bph")}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="amtrak" className="flex items-center gap-2">
              <Train className="h-4 w-4" />
              Amtrak
            </TabsTrigger>
            <TabsTrigger value="bph" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              BPH
            </TabsTrigger>
          </TabsList>

          {/* Amtrak Schedule */}
          <TabsContent value="amtrak">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Train className="h-5 w-5" />
                    Amtrak Weekly Schedule
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Monday - Sunday, 3 shifts per day</p>
                </div>
                <Button onClick={saveAmtrakSchedules} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {/* Coverage gaps warning */}
                {getAmtrakGaps().length > 0 && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Coverage Gaps</p>
                      <p className="text-xs text-muted-foreground">
                        {getAmtrakGaps().slice(0, 5).map(g => `${g.day} ${g.shift}`).join(", ")}
                        {getAmtrakGaps().length > 5 && ` +${getAmtrakGaps().length - 5} more`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Available drivers */}
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Available Drivers ({amtrakDrivers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {amtrakDrivers.map(d => (
                      <Badge 
                        key={d.id} 
                        variant={d.amtrak_primary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {d.name}
                        {d.amtrak_primary && " ★"}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Schedule grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-2 border-b font-medium text-muted-foreground">Day</th>
                        {AMTRAK_SHIFTS.map(shift => (
                          <th key={shift.number} className="text-left p-2 border-b font-medium text-muted-foreground">
                            <div>{shift.label}</div>
                            <div className="text-xs font-normal">{shift.defaultStart} - {shift.defaultEnd}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AMTRAK_DAYS.map(day => (
                        <tr key={day.value} className="border-b">
                          <td className="p-2 font-medium">{day.label}</td>
                          {AMTRAK_SHIFTS.map(shift => {
                            const key = `${day.value}-${shift.number}`;
                            const selectedDriverId = amtrakSchedule[key];
                            return (
                              <td key={shift.number} className="p-2">
                                <Select
                                  value={selectedDriverId || "none"}
                                  onValueChange={(v) => handleAmtrakChange(day.value, shift.number, v === "none" ? null : v)}
                                >
                                  <SelectTrigger className={cn(
                                    "w-full",
                                    !selectedDriverId && "border-dashed border-muted-foreground/30"
                                  )}>
                                    <SelectValue placeholder="Unassigned">
                                      {selectedDriverId ? (
                                        <span className="flex items-center">
                                          {getDriverName(selectedDriverId)}
                                          {getDriverBadge(selectedDriverId, "amtrak")}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">Unassigned</span>
                                    </SelectItem>
                                    {amtrakDrivers.map(d => (
                                      <SelectItem key={d.id} value={d.id}>
                                        <span className="flex items-center gap-2">
                                          {d.name}
                                          {d.amtrak_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BPH Schedule */}
          <TabsContent value="bph">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    BPH Weekly Schedule
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Monday - Friday, 1 shift per day with custom times</p>
                </div>
                <Button onClick={saveBphSchedules} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {/* Coverage gaps warning */}
                {getBphGaps().length > 0 && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Coverage Gaps</p>
                      <p className="text-xs text-muted-foreground">{getBphGaps().join(", ")}</p>
                    </div>
                  </div>
                )}

                {/* Available drivers */}
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Available Drivers ({bphDrivers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {bphDrivers.map(d => (
                      <Badge 
                        key={d.id} 
                        variant={d.bph_primary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {d.name}
                        {d.bph_primary && " ★"}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Schedule list */}
                <div className="space-y-4">
                  {BPH_DAYS.map(day => {
                    const data = bphSchedule[day.value.toString()] || { driverId: null, startTime: "08:00", endTime: "16:00" };
                    return (
                      <div key={day.value} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="w-24 font-medium">{day.label}</div>
                        <div className="flex-1">
                          <Select
                            value={data.driverId || "none"}
                            onValueChange={(v) => handleBphChange(day.value, "driverId", v === "none" ? null : v)}
                          >
                            <SelectTrigger className={cn(
                              "w-full",
                              !data.driverId && "border-dashed border-muted-foreground/30"
                            )}>
                              <SelectValue placeholder="Unassigned">
                                {data.driverId ? (
                                  <span className="flex items-center">
                                    {getDriverName(data.driverId)}
                                    {getDriverBadge(data.driverId, "bph")}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Unassigned</span>
                              </SelectItem>
                              {bphDrivers.map(d => (
                                <SelectItem key={d.id} value={d.id}>
                                  <span className="flex items-center gap-2">
                                    {d.name}
                                    {d.bph_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <Label className="text-xs text-muted-foreground mb-1">Start</Label>
                            <Input
                              type="time"
                              value={data.startTime}
                              onChange={(e) => handleBphChange(day.value, "startTime", e.target.value)}
                              className="w-28"
                            />
                          </div>
                          <div className="flex flex-col">
                            <Label className="text-xs text-muted-foreground mb-1">End</Label>
                            <Input
                              type="time"
                              value={data.endTime}
                              onChange={(e) => handleBphChange(day.value, "endTime", e.target.value)}
                              className="w-28"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShuttleSchedules;
