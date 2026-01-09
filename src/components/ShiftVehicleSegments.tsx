import { useState } from "react";
import { Truck, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import { format, parseISO } from "date-fns";
import type { ShiftVehicleSegment, Shift } from "@/hooks/useShifts";
import type { Database } from "@/integrations/supabase/types";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

interface ShiftVehicleSegmentsProps {
  shift: Shift;
  segments: ShiftVehicleSegment[];
  vehicles: VehicleRow[];
  onChangeVehicle: (newVehicle: string, changeTime?: string) => Promise<void>;
  canEdit: boolean;
}

export function ShiftVehicleSegments({
  shift,
  segments,
  vehicles,
  onChangeVehicle,
  canEdit,
}: ShiftVehicleSegmentsProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [newVehicle, setNewVehicle] = useState("");
  const [changeTime, setChangeTime] = useState(format(new Date(), "HH:mm"));
  const [loading, setLoading] = useState(false);

  const activeSegment = segments.find(s => !s.segment_out_at);
  const closedSegments = segments.filter(s => s.segment_out_at);

  const handleChangeVehicle = async () => {
    if (!newVehicle) return;
    setLoading(true);
    await onChangeVehicle(newVehicle, changeTime);
    setLoading(false);
    setIsChanging(false);
    setNewVehicle("");
  };

  const availableVehicles = vehicles.filter(v => v.status === "active");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Vehicle Segments</span>
        {canEdit && !shift.punch_out_at && !isChanging && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setIsChanging(true);
              setChangeTime(format(new Date(), "HH:mm"));
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Change Vehicle
          </Button>
        )}
      </div>

      {/* Closed segments */}
      {closedSegments.map(segment => (
        <div
          key={segment.id}
          className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
        >
          <Truck className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono font-medium">{segment.vehicle_unit}</span>
          <span className="text-muted-foreground">
            {format(parseISO(segment.segment_in_at), "h:mm a")} - {format(parseISO(segment.segment_out_at!), "h:mm a")}
          </span>
        </div>
      ))}

      {/* Active segment */}
      {activeSegment && (
        <div className="flex items-center gap-2 rounded bg-primary/10 border border-primary/30 px-2 py-1 text-xs">
          <Truck className="h-3 w-3 text-primary" />
          <span className="font-mono font-medium">{activeSegment.vehicle_unit}</span>
          <span className="text-muted-foreground">
            since {format(parseISO(activeSegment.segment_in_at), "h:mm a")}
          </span>
        </div>
      )}

      {/* No segments */}
      {segments.length === 0 && (
        <div className="text-xs text-muted-foreground italic">No vehicle assigned</div>
      )}

      {/* Change vehicle form */}
      {isChanging && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Select value={newVehicle} onValueChange={setNewVehicle}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {availableVehicles.map(v => (
                <SelectItem key={v.id} value={v.unit}>
                  {v.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimeInput
            value={changeTime}
            onChange={setChangeTime}
            className="h-8 w-20 text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleChangeVehicle}
            disabled={!newVehicle || loading}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setIsChanging(false);
              setNewVehicle("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
