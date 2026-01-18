import { useState, useMemo } from 'react';
import { Search, Plus, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { QueueItemUrgency } from '@/hooks/useCleaningQueues';

interface Vehicle {
  id: string;
  unit: string;
  classification: string;
  status: string;
}

interface AddVehicleToQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  existingVehicleIds: string[];
  isSpecialty: boolean;
  onAdd: (vehicleId: string, outAt?: string | null, urgency?: QueueItemUrgency) => void;
}

export function AddVehicleToQueueDialog({
  open,
  onOpenChange,
  vehicles,
  existingVehicleIds,
  isSpecialty,
  onAdd,
}: AddVehicleToQueueDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [outAt, setOutAt] = useState('');
  const [urgency, setUrgency] = useState<QueueItemUrgency>('NORMAL');

  // Filter vehicles based on queue type and search
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter((v) => !existingVehicleIds.includes(v.id));

    // For specialty queue, only show specialty vehicles
    // For general queue, exclude specialty vehicles
    if (isSpecialty) {
      filtered = filtered.filter((v) => v.classification === 'specialty');
    } else {
      filtered = filtered.filter((v) => v.classification !== 'specialty');
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((v) => v.unit.toLowerCase().includes(searchLower));
    }

    return filtered.slice(0, 20); // Limit for performance
  }, [vehicles, existingVehicleIds, isSpecialty, search]);

  const handleAdd = () => {
    if (!selectedVehicle) return;

    const outAtValue = outAt
      ? `${new Date().toISOString().split('T')[0]}T${outAt}:00`
      : null;

    onAdd(selectedVehicle.id, outAtValue, urgency);
    handleClose();
  };

  const handleClose = () => {
    setSearch('');
    setSelectedVehicle(null);
    setOutAt('');
    setUrgency('NORMAL');
    onOpenChange(false);
  };

  const handleQuickAdd = (vehicle: Vehicle) => {
    if (isSpecialty) {
      // For specialty, select and show form
      setSelectedVehicle(vehicle);
    } else {
      // For general, add immediately
      onAdd(vehicle.id, null, 'NORMAL');
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Vehicle to {isSpecialty ? 'Specialty' : 'General'} Queue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Vehicle selection or list */}
          {selectedVehicle ? (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-lg">{selectedVehicle.unit}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVehicle(null)}
                >
                  Change
                </Button>
              </div>

              {isSpecialty && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Out At (Required)
                  </label>
                  <Input
                    type="time"
                    value={outAt}
                    onChange={(e) => setOutAt(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Urgency</label>
                <Select value={urgency} onValueChange={(v: QueueItemUrgency) => setUrgency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAdd}
                className="w-full"
                disabled={isSpecialty && !outAt}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Queue
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredVehicles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {search ? 'No vehicles found' : 'All vehicles are already in queue'}
                  </p>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleQuickAdd(vehicle)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg',
                        'hover:bg-muted transition-colors text-left',
                        'focus:outline-none focus:ring-2 focus:ring-primary'
                      )}
                    >
                      <span className="font-mono font-medium">{vehicle.unit}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {vehicle.classification}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
