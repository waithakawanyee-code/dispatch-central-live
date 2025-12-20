import { useState, useEffect } from "react";
import { X, User, Phone, Mail, MapPin, Car, FileText, AlertCircle, Shield } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
}

const initialFormData: DriverProfileFormData = {
  name: "",
  code: "",
  phone: "",
  email: "",
  address: "",
  is_active: true,
  has_cdl: false,
  notes: "",
  default_vehicle: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
};

interface DriverProfileDialogProps {
  driver: DriverRow | null;
  vehicles: VehicleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  mode?: "add" | "edit";
}

export function DriverProfileDialog({
  driver,
  vehicles,
  open,
  onOpenChange,
  onSaved,
  mode = "edit",
}: DriverProfileDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<DriverProfileFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const isAddMode = mode === "add";

  useEffect(() => {
    if (open) {
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
          emergency_contact_name: (driver as any).emergency_contact_name || "",
          emergency_contact_phone: (driver as any).emergency_contact_phone || "",
          emergency_contact_relationship: (driver as any).emergency_contact_relationship || "",
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [driver, open, isAddMode]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    if (isAddMode) {
      // Insert new driver
      const { error } = await supabase.from("drivers").insert({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase().slice(0, 4) || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        is_active: formData.is_active,
        has_cdl: formData.has_cdl,
        notes: formData.notes.trim() || null,
        default_vehicle: formData.default_vehicle.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        emergency_contact_relationship: formData.emergency_contact_relationship.trim() || null,
      });

      setSaving(false);

      if (error) {
        toast({ title: "Error", description: "Failed to add driver", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Driver added successfully" });
        onOpenChange(false);
        onSaved?.();
      }
    } else {
      // Update existing driver
      if (!driver) {
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("drivers")
        .update({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase().slice(0, 4) || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          is_active: formData.is_active,
          has_cdl: formData.has_cdl,
          notes: formData.notes.trim() || null,
          default_vehicle: formData.default_vehicle.trim() || null,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
          emergency_contact_relationship: formData.emergency_contact_relationship.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver.id);

      setSaving(false);

      if (error) {
        toast({ title: "Error", description: "Failed to update driver", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Driver profile updated" });
        onOpenChange(false);
        onSaved?.();
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isAddMode ? "Add New Driver" : "Driver Profile"}
          </SheetTitle>
        </SheetHeader>

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
                <Input
                  id="profile-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Driver's full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-code">Driver Code</Label>
                  <Input
                    id="profile-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 4) })}
                    placeholder="ABCD"
                    maxLength={4}
                    className="font-mono uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-status">Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                  >
                    <SelectTrigger id="profile-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-cdl">License Type</Label>
                <Select
                  value={formData.has_cdl ? "cdl" : "non-cdl"}
                  onValueChange={(value) => setFormData({ ...formData, has_cdl: value === "cdl" })}
                >
                  <SelectTrigger id="profile-cdl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdl">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        CDL
                      </div>
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
                  <Input
                    id="profile-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="555-0100"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="driver@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="profile-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                    className="pl-10 min-h-[60px]"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Emergency Contact
            </h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-emergency-name">Contact Name</Label>
                <Input
                  id="profile-emergency-name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Emergency contact name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-emergency-phone">Contact Phone</Label>
                  <Input
                    id="profile-emergency-phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="555-0199"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-emergency-relationship">Relationship</Label>
                  <Input
                    id="profile-emergency-relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Assignment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle Assignment
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="profile-vehicle">Default Vehicle (Take-Home)</Label>
              <Select
                value={formData.default_vehicle || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, default_vehicle: value === "__none__" ? "" : value })}
              >
                <SelectTrigger id="profile-vehicle">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.unit}>{v.unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Textarea
                id="profile-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this driver..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : isAddMode ? "Add Driver" : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
