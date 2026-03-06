import { useState, useEffect } from "react";
import {
  User, Phone, Mail, MapPin, Car, FileText, AlertCircle, Shield, Calendar, Clock, Copy, Plus, X, Train, Stethoscope, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

interface DriverProfileFormData {
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  has_cdl: boolean;
  notes: string;
  default_vehicle: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  emergency_contact_name_2: string;
  emergency_contact_phone_2: string;
  emergency_contact_relationship_2: string;
  amtrak_trained: boolean;
  amtrak_primary: boolean;
  bph_trained: boolean;
  bph_primary: boolean;
  amtrak_notes: string;
  bph_notes: string;
}

interface DaySchedule {
  is_off: boolean;
  is_any_hours: boolean;
  start_time: string;
  end_time: string;
  note: string;
}

type WeeklySchedule = Record<number, DaySchedule>;

interface ShuttleDaySchedule {
  is_working: boolean;
  shift_number: number;
}

type ShuttleWeeklySchedule = Record<number, ShuttleDaySchedule>;

const AMTRAK_SHIFTS = [
  { number: 1, label: "Shift 1", start: "03:00", end: "11:00" },
  { number: 2, label: "Shift 2", start: "11:00", end: "19:00" },
  { number: 3, label: "Shift 3", start: "19:00", end: "03:00" },
];

const BPH_SHIFT = { start: "06:00", end: "18:00", label: "06:00 AM – 06:00 PM" };

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const initialSchedule: WeeklySchedule = {
  0: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  1: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  2: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  3: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  4: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  5: { is_off: false, is_any_hours: false, start_time: "00:00", end_time: "", note: "" },
  6: { is_off: true, is_any_hours: false, start_time: "", end_time: "", note: "" },
};

const initialShuttleSchedule: ShuttleWeeklySchedule = {
  0: { is_working: false, shift_number: 1 },
  1: { is_working: true, shift_number: 1 },
  2: { is_working: true, shift_number: 1 },
  3: { is_working: true, shift_number: 1 },
  4: { is_working: true, shift_number: 1 },
  5: { is_working: true, shift_number: 1 },
  6: { is_working: false, shift_number: 1 },
};

const initialFormData: DriverProfileFormData = {
  name: "", code: "", phone: "", email: "", address: "",
  is_active: true, has_cdl: false, notes: "", default_vehicle: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
  emergency_contact_name_2: "", emergency_contact_phone_2: "", emergency_contact_relationship_2: "",
  amtrak_trained: false, amtrak_primary: false, bph_trained: false, bph_primary: false,
  amtrak_notes: "", bph_notes: "",
};

interface DriverProfileFormProps {
  driver: DriverRow | null;
  vehicles: VehicleRow[];
  onSaved?: () => void;
  mode?: "add" | "edit";
}

export function DriverProfileForm({ driver, vehicles, onSaved, mode = "edit" }: DriverProfileFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<DriverProfileFormData>(initialFormData);
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule);
  const [shuttleSchedule, setShuttleSchedule] = useState<ShuttleWeeklySchedule>(initialShuttleSchedule);
  const [saving, setSaving] = useState(false);
  const isAddMode = mode === "add";

  const isPrimaryShuttle = formData.amtrak_primary || formData.bph_primary;
  const shuttleProgram = formData.amtrak_primary ? "amtrak" : formData.bph_primary ? "bph" : null;

  useEffect(() => {
    const fetchSchedules = async () => {
      if (driver && !isAddMode) {
        // Fetch regular schedule
        const { data } = await supabase.from("driver_schedules").select("*").eq("driver_id", driver.id);
        if (data && data.length > 0) {
          const scheduleMap: WeeklySchedule = { ...initialSchedule };
          data.forEach((s) => {
            scheduleMap[s.day_of_week] = {
              is_off: s.is_off,
              is_any_hours: (s as any).is_any_hours || false,
              start_time: s.start_time || "",
              end_time: s.end_time || "",
              note: (s as any).note || "",
            };
          });
          setSchedule(scheduleMap);
        } else {
          setSchedule(initialSchedule);
        }

        // Fetch shuttle schedule
        const { data: shuttleData } = await supabase
          .from("shuttle_schedules")
          .select("*")
          .eq("driver_id", driver.id);
        if (shuttleData && shuttleData.length > 0) {
          const shuttleMap: ShuttleWeeklySchedule = { ...initialShuttleSchedule };
          // Mark all days as not working first, then set from data
          Object.keys(shuttleMap).forEach(k => { shuttleMap[Number(k)] = { is_working: false, shift_number: 1 }; });
          shuttleData.forEach((s) => {
            shuttleMap[s.day_of_week] = {
              is_working: true,
              shift_number: s.shift_number,
            };
          });
          setShuttleSchedule(shuttleMap);
        } else {
          setShuttleSchedule(initialShuttleSchedule);
        }
      } else {
        setSchedule(initialSchedule);
        setShuttleSchedule(initialShuttleSchedule);
      }
    };
    fetchSchedules();
  }, [driver, isAddMode]);

  useEffect(() => {
    if (driver && !isAddMode) {
      setFormData({
        name: driver.name || "",
        code: driver.code || "",
        phone: driver.phone || "",
        email: driver.email || "",
        address: driver.address || "",
        is_active: driver.is_active !== false,
        has_cdl: driver.has_cdl === true,
        notes: driver.notes || "",
        default_vehicle: driver.default_vehicle || "",
        emergency_contact_name: driver.emergency_contact_name || "",
        emergency_contact_phone: driver.emergency_contact_phone || "",
        emergency_contact_relationship: driver.emergency_contact_relationship || "",
        emergency_contact_name_2: (driver as any).emergency_contact_name_2 || "",
        emergency_contact_phone_2: (driver as any).emergency_contact_phone_2 || "",
        emergency_contact_relationship_2: (driver as any).emergency_contact_relationship_2 || "",
        amtrak_trained: (driver as any).amtrak_trained || false,
        amtrak_primary: (driver as any).amtrak_primary || false,
        bph_trained: (driver as any).bph_trained || false,
        bph_primary: (driver as any).bph_primary || false,
        amtrak_notes: (driver as any).amtrak_notes || "",
        bph_notes: (driver as any).bph_notes || "",
      });
    } else {
      setFormData(initialFormData);
    }
  }, [driver, isAddMode]);

  const updateDaySchedule = (day: number, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
        ...(field === "is_off" && value === true ? { start_time: "", end_time: "", note: "" } : {}),
      },
    }));
  };

  const copyMondayToAll = () => {
    const mondaySchedule = schedule[1];
    setSchedule((prev) => ({
      ...prev,
      0: { ...mondaySchedule }, 2: { ...mondaySchedule }, 3: { ...mondaySchedule },
      4: { ...mondaySchedule }, 5: { ...mondaySchedule }, 6: { ...mondaySchedule },
    }));
  };

  const saveSchedule = async (driverId: string) => {
    await supabase.from("driver_schedules").delete().eq("driver_id", driverId);
    const scheduleInserts = Object.entries(schedule).map(([day, data]) => ({
      driver_id: driverId,
      day_of_week: parseInt(day),
      is_off: data.is_off,
      is_any_hours: data.is_off ? false : data.is_any_hours,
      start_time: data.is_off ? null : data.start_time || null,
      end_time: data.is_off ? null : data.end_time || null,
      note: data.is_off ? null : data.note || null,
    }));
    const { error } = await supabase.from("driver_schedules").insert(scheduleInserts);
    return error;
  };

  const saveShuttleSchedule = async (driverId: string, program: string) => {
    // Delete existing shuttle schedules for this driver and program
    await supabase.from("shuttle_schedules").delete().eq("driver_id", driverId).eq("program", program);
    
    const workingDays = Object.entries(shuttleSchedule)
      .filter(([_, data]) => data.is_working)
      .map(([day, data]) => {
        const shift = program === "amtrak" 
          ? AMTRAK_SHIFTS.find(s => s.number === data.shift_number) || AMTRAK_SHIFTS[0]
          : null;
        return {
          driver_id: driverId,
          day_of_week: parseInt(day),
          shift_number: data.shift_number,
          program,
          start_time: program === "amtrak" ? shift!.start : BPH_SHIFT.start,
          end_time: program === "amtrak" ? shift!.end : BPH_SHIFT.end,
        };
      });
    
    if (workingDays.length > 0) {
      const { error } = await supabase.from("shuttle_schedules").insert(workingDays);
      return error;
    }
    return null;
  };

  const syncVehicleAssignment = async (driverId: string, newVehicleUnit: string | null, oldVehicleUnit: string | null) => {
    if (newVehicleUnit === oldVehicleUnit) return;
    if (oldVehicleUnit) {
      const { data: oldVehicle } = await supabase
        .from("vehicles").select("id, classification, assigned_driver_id")
        .eq("unit", oldVehicleUnit).maybeSingle();
      if (oldVehicle && oldVehicle.classification === "take_home" && oldVehicle.assigned_driver_id === driverId) {
        await supabase.from("vehicles").update({ assigned_driver_id: null }).eq("id", oldVehicle.id);
      }
    }
    if (newVehicleUnit) {
      const { data: newVehicle } = await supabase
        .from("vehicles").select("id, classification").eq("unit", newVehicleUnit).maybeSingle();
      if (newVehicle) {
        await supabase.from("vehicles")
          .update({ assigned_driver_id: driverId, classification: "take_home" })
          .eq("id", newVehicle.id);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (isAddMode) {
      const { data: newDriver, error } = await supabase
        .from("drivers")
        .insert({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase().slice(0, 4) || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          is_active: formData.is_active, has_cdl: formData.has_cdl,
          notes: formData.notes.trim() || null,
          default_vehicle: formData.default_vehicle.trim() || null,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
          emergency_contact_relationship: formData.emergency_contact_relationship.trim() || null,
          emergency_contact_name_2: formData.emergency_contact_name_2.trim() || null,
          emergency_contact_phone_2: formData.emergency_contact_phone_2.trim() || null,
          emergency_contact_relationship_2: formData.emergency_contact_relationship_2.trim() || null,
          amtrak_trained: formData.amtrak_trained, amtrak_primary: formData.amtrak_primary,
          bph_trained: formData.bph_trained, bph_primary: formData.bph_primary,
          amtrak_notes: formData.amtrak_notes.trim() || null,
          bph_notes: formData.bph_notes.trim() || null,
        } as any)
        .select("id").single();

      if (error || !newDriver) {
        setSaving(false);
        toast({ title: "Error", description: "Failed to add driver", variant: "destructive" });
      } else {
        await saveSchedule(newDriver.id);
        if (formData.amtrak_primary) await saveShuttleSchedule(newDriver.id, "amtrak");
        if (formData.bph_primary) await saveShuttleSchedule(newDriver.id, "bph");
        await syncVehicleAssignment(newDriver.id, formData.default_vehicle.trim() || null, null);
        setSaving(false);
        toast({ title: "Success", description: "Driver added successfully" });
        onSaved?.();
      }
    } else {
      if (!driver) { setSaving(false); return; }
      const oldVehicleUnit = driver.default_vehicle || null;
      const newVehicleUnit = formData.default_vehicle.trim() || null;

      const { error } = await supabase
        .from("drivers")
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase().slice(0, 4) || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          is_active: formData.is_active, has_cdl: formData.has_cdl,
          notes: formData.notes.trim() || null,
          default_vehicle: newVehicleUnit,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
          emergency_contact_relationship: formData.emergency_contact_relationship.trim() || null,
          emergency_contact_name_2: formData.emergency_contact_name_2.trim() || null,
          emergency_contact_phone_2: formData.emergency_contact_phone_2.trim() || null,
          emergency_contact_relationship_2: formData.emergency_contact_relationship_2.trim() || null,
          amtrak_trained: formData.amtrak_trained, amtrak_primary: formData.amtrak_primary,
          bph_trained: formData.bph_trained, bph_primary: formData.bph_primary,
          amtrak_notes: formData.amtrak_notes.trim() || null,
          bph_notes: formData.bph_notes.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", driver.id);

      if (error) {
        setSaving(false);
        toast({ title: "Error", description: "Failed to update driver", variant: "destructive" });
      } else {
        await saveSchedule(driver.id);
        if (formData.amtrak_primary) await saveShuttleSchedule(driver.id, "amtrak");
        if (formData.bph_primary) await saveShuttleSchedule(driver.id, "bph");
        await syncVehicleAssignment(driver.id, newVehicleUnit, oldVehicleUnit);
        setSaving(false);
        toast({ title: "Success", description: "Driver profile updated" });
        onSaved?.();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          Basic Information
        </h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name *</Label>
            <Input id="profile-name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Driver's full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-code">Driver Code</Label>
              <Input id="profile-code" value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 4) })}
                placeholder="ABCD" maxLength={4} className="font-mono uppercase" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-status">Status</Label>
              <Select value={formData.is_active ? "active" : "inactive"}
                onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}>
                <SelectTrigger id="profile-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-cdl">License Type</Label>
            <Select value={formData.has_cdl ? "cdl" : "non-cdl"}
              onValueChange={(value) => setFormData({ ...formData, has_cdl: value === "cdl" })}>
              <SelectTrigger id="profile-cdl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cdl">
                  <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" />CDL</div>
                </SelectItem>
                <SelectItem value="non-cdl">Non-CDL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Contact Information
        </h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="profile-phone" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="555-555-5555" className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="profile-email" type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="driver@example.com" className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea id="profile-address" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address" className="pl-10 min-h-[60px]" rows={2} />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Emergency Contacts */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Emergency Contacts
        </h3>
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Primary Contact</p>
          <div className="space-y-2">
            <Label htmlFor="profile-emergency-name">Contact Name</Label>
            <Input id="profile-emergency-name" value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              placeholder="Emergency contact name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-emergency-phone">Contact Phone</Label>
              <Input id="profile-emergency-phone" value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                placeholder="555-555-0199" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-emergency-relationship">Relationship</Label>
              <Input id="profile-emergency-relationship" value={formData.emergency_contact_relationship}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                placeholder="e.g., Spouse, Parent" />
            </div>
          </div>
        </div>
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Secondary Contact</p>
          <div className="space-y-2">
            <Label htmlFor="profile-emergency-name-2">Contact Name</Label>
            <Input id="profile-emergency-name-2" value={formData.emergency_contact_name_2}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name_2: e.target.value })}
              placeholder="Emergency contact name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-emergency-phone-2">Contact Phone</Label>
              <Input id="profile-emergency-phone-2" value={formData.emergency_contact_phone_2}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone_2: e.target.value })}
                placeholder="555-555-0199" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-emergency-relationship-2">Relationship</Label>
              <Input id="profile-emergency-relationship-2" value={formData.emergency_contact_relationship_2}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relationship_2: e.target.value })}
                placeholder="e.g., Sibling, Friend" />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Shuttle Programs */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Train className="h-4 w-4" />
          Shuttle Programs
        </h3>
        {/* Amtrak */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Train className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Amtrak Shuttle</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="amtrak-trained" className="text-sm">Trained (Backup Eligible)</Label>
              <Switch id="amtrak-trained" checked={formData.amtrak_trained}
                onCheckedChange={(checked) => setFormData({ ...formData, amtrak_trained: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="amtrak-primary" className="text-sm">Primary Scheduled Driver</Label>
              <Switch id="amtrak-primary" checked={formData.amtrak_primary}
                onCheckedChange={(checked) => setFormData({ ...formData, amtrak_primary: checked, amtrak_trained: checked ? true : formData.amtrak_trained })} />
            </div>
            {formData.amtrak_primary && (
              <p className="text-xs text-muted-foreground italic p-2 rounded bg-muted/50 border border-border">
                Configure work days and shifts in the Shuttle Schedule section below.
              </p>
            )}
            {(formData.amtrak_trained || formData.amtrak_primary) && (
              <div className="space-y-2">
                <Label htmlFor="amtrak-notes" className="text-xs">Program Notes</Label>
                <Textarea id="amtrak-notes" value={formData.amtrak_notes}
                  onChange={(e) => setFormData({ ...formData, amtrak_notes: e.target.value })}
                  placeholder="Route info, station rules..." rows={2} className="text-sm" />
              </div>
            )}
          </div>
        </div>
        {/* BPH */}
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Boston Public Health (BPH)</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bph-trained" className="text-sm">Trained (Backup Eligible)</Label>
              <Switch id="bph-trained" checked={formData.bph_trained}
                onCheckedChange={(checked) => setFormData({ ...formData, bph_trained: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bph-primary" className="text-sm">Primary Scheduled Driver</Label>
              <Switch id="bph-primary" checked={formData.bph_primary}
                onCheckedChange={(checked) => setFormData({ ...formData, bph_primary: checked, bph_trained: checked ? true : formData.bph_trained })} />
            </div>
            {formData.bph_primary && (
              <p className="text-xs text-muted-foreground italic p-2 rounded bg-muted/50 border border-border">
                Configure work days in the Shuttle Schedule section below.
              </p>
            )}
            {(formData.bph_trained || formData.bph_primary) && (
              <div className="space-y-2">
                <Label htmlFor="bph-notes" className="text-xs">Program Notes</Label>
                <Textarea id="bph-notes" value={formData.bph_notes}
                  onChange={(e) => setFormData({ ...formData, bph_notes: e.target.value })}
                  placeholder="Route info, pickup locations..." rows={2} className="text-sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Schedule Section - Shuttle or Regular */}
      {isPrimaryShuttle ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {shuttleProgram === "amtrak" ? "Amtrak" : "BPH"} Shuttle Schedule
          </h3>
          {shuttleProgram === "amtrak" && (
            <div className="p-2 rounded bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Available Shifts:</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {AMTRAK_SHIFTS.map((s) => (
                  <span key={s.number} className="font-mono">{s.label}: {s.start}–{s.end}</span>
                ))}
              </div>
            </div>
          )}
          {shuttleProgram === "bph" && (
            <div className="p-2 rounded bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">Fixed shift: {BPH_SHIFT.label}</p>
            </div>
          )}
          <div className="space-y-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  shuttleSchedule[day.value]?.is_working ? "" : "bg-muted/50"
                }`}>
                <span className="text-sm font-medium w-[60px]">{day.short}</span>
                <Switch
                  checked={shuttleSchedule[day.value]?.is_working || false}
                  onCheckedChange={(checked) =>
                    setShuttleSchedule((prev) => ({
                      ...prev,
                      [day.value]: { ...prev[day.value], is_working: checked },
                    }))
                  }
                />
                {shuttleSchedule[day.value]?.is_working ? (
                  shuttleProgram === "amtrak" ? (
                    <Select
                      value={String(shuttleSchedule[day.value]?.shift_number || 1)}
                      onValueChange={(v) =>
                        setShuttleSchedule((prev) => ({
                          ...prev,
                          [day.value]: { ...prev[day.value], shift_number: parseInt(v) },
                        }))
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AMTRAK_SHIFTS.map((s) => (
                          <SelectItem key={s.number} value={String(s.number)}>
                            {s.label} ({s.start}–{s.end})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{BPH_SHIFT.label}</span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground italic">Off</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Weekly Schedule
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={copyMondayToAll} className="text-xs">
              <Copy className="h-3 w-3 mr-1" />
              Copy All
            </Button>
          </div>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value}
                className={`flex flex-col gap-2 p-2 rounded-lg transition-colors ${schedule[day.value]?.is_off ? "bg-muted/50" : ""}`}>
                <div className="grid grid-cols-[80px_60px_1fr] gap-3 items-center">
                  <span className="text-sm font-medium">{day.short}</span>
                  <div className="flex items-center gap-2">
                    <Switch id={`day-off-${day.value}`}
                      checked={!schedule[day.value]?.is_off}
                      onCheckedChange={(checked) => updateDaySchedule(day.value, "is_off", !checked)} />
                    <Label htmlFor={`day-off-${day.value}`} className="text-xs text-muted-foreground">
                      {schedule[day.value]?.is_off ? "Off" : "On"}
                    </Label>
                  </div>
                  {!schedule[day.value]?.is_off && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <Input type="time" value={schedule[day.value]?.start_time || ""}
                          onChange={(e) => updateDaySchedule(day.value, "start_time", e.target.value)}
                          className="h-8 w-[100px] text-xs" />
                      </div>
                      <span className="text-muted-foreground text-xs">to</span>
                      {schedule[day.value]?.end_time ? (
                        <div className="flex items-center gap-1">
                          <Input type="time" value={schedule[day.value]?.end_time || ""}
                            onChange={(e) => updateDaySchedule(day.value, "end_time", e.target.value)}
                            className="h-8 w-[100px] text-xs" />
                          <Button type="button" variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => updateDaySchedule(day.value, "end_time", "")}>
                            <X className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Strict Out</span>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="sm"
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => updateDaySchedule(day.value, "end_time", "17:00")}>
                          <Plus className="h-3 w-3 mr-1" />End Time
                        </Button>
                      )}
                    </div>
                  )}
                  {schedule[day.value]?.is_off && (
                    <span className="text-xs text-muted-foreground italic">Day off</span>
                  )}
                </div>
                {!schedule[day.value]?.is_off && (
                  <div className="ml-[140px] flex items-center gap-2">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <Input type="text" placeholder="Add note (e.g., sick, doctor appt)"
                      value={schedule[day.value]?.note || ""}
                      onChange={(e) => updateDaySchedule(day.value, "note", e.target.value)}
                      className="h-7 text-xs flex-1" />
                    <div className="flex items-center gap-1.5 ml-2">
                      <Checkbox id={`any-hours-${day.value}`}
                        checked={schedule[day.value]?.is_any_hours || false}
                        onCheckedChange={(checked) => updateDaySchedule(day.value, "is_any_hours", checked === true)}
                        className="h-3.5 w-3.5" />
                      <Label htmlFor={`any-hours-${day.value}`} className="text-[10px] text-muted-foreground cursor-pointer">Any</Label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Vehicle Assignment */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Car className="h-4 w-4" />
          Vehicle Assignment
        </h3>
        <div className="space-y-2">
          <Label htmlFor="profile-vehicle">Default Vehicle (Take-Home)</Label>
          <Select value={formData.default_vehicle || "__none__"}
            onValueChange={(value) => setFormData({ ...formData, default_vehicle: value === "__none__" ? "" : value })}>
            <SelectTrigger id="profile-vehicle"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {vehicles
                .filter(v => v.status === "active" && v.primary_category === "above_all")
                .map((v) => {
                  const isAssignedToOther = v.assigned_driver_id && v.assigned_driver_id !== driver?.id;
                  const isCurrentlySelected = v.unit === formData.default_vehicle;
                  return (
                    <SelectItem key={v.id} value={v.unit}
                      disabled={isAssignedToOther && !isCurrentlySelected}>
                      {v.unit}
                      {v.classification === "take_home" && v.assigned_driver_id === driver?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      )}
                      {isAssignedToOther && (
                        <span className="ml-2 text-xs text-muted-foreground">(assigned)</span>
                      )}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Setting a default vehicle will mark it as a take-home vehicle owned by this driver.
          </p>
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notes
        </h3>
        <div className="space-y-2">
          <Textarea id="profile-notes" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about this driver..." rows={3} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Saving..." : isAddMode ? "Add Driver" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
