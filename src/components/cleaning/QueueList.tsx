import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueueItemRow } from './QueueItemRow';
import { AddVehicleToQueueDialog } from './AddVehicleToQueueDialog';
import { useCleaningQueueItems, type CleaningQueueItem, type QueueItemUrgency } from '@/hooks/useCleaningQueues';
import { useQueueAlerts } from '@/hooks/useCleaningQueues';

interface Vehicle {
  id: string;
  unit: string;
  classification: string;
  status: string;
}

interface QueueListProps {
  queueId: string | null;
  queueType: 'SPECIALTY' | 'GENERAL';
  vehicles: Vehicle[];
  isLoading?: boolean;
}

export function QueueList({ queueId, queueType, vehicles, isLoading }: QueueListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CleaningQueueItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { items, addItem, updateItem, removeItem, reorderItems } = useCleaningQueueItems(queueId);
  const { createAlert } = useQueueAlerts(null);

  const isSpecialty = queueType === 'SPECIALTY';
  const existingVehicleIds = items.map((item) => item.vehicle_id);

  const handleAddVehicle = useCallback(
    async (vehicleId: string, outAt?: string | null, urgency?: QueueItemUrgency) => {
      if (!queueId) return;
      await addItem.mutateAsync({
        queueId,
        vehicleId,
        outAt,
        urgency,
      });
    },
    [queueId, addItem]
  );

  const handleUpdate = useCallback(
    (itemId: string, updates: Partial<Pick<CleaningQueueItem, 'out_at' | 'urgency' | 'dispatcher_notes'>>) => {
      updateItem.mutate({ itemId, updates });
    },
    [updateItem]
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      removeItem.mutate(itemId);
    },
    [removeItem]
  );

  const handleCreateAlert = useCallback(
    (queueItemId: string, message?: string) => {
      createAlert.mutate({ queueItemId, alertMessage: message });
    },
    [createAlert]
  );

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: CleaningQueueItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverIndex !== null) {
      const newItems = [...items];
      const draggedIndex = items.findIndex((i) => i.id === draggedItem.id);

      if (draggedIndex !== dragOverIndex) {
        newItems.splice(draggedIndex, 1);
        newItems.splice(dragOverIndex, 0, draggedItem);

        // Update positions
        const updates = newItems.map((item, index) => ({
          id: item.id,
          position: index + 1,
        }));
        reorderItems.mutate(updates);
      }
    }

    setDraggedItem(null);
    setDragOverIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {items.length} vehicle{items.length !== 1 ? 's' : ''} in queue
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          disabled={!queueId}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Vehicle
        </Button>
      </div>

      {/* Queue items */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No vehicles in this queue yet.</p>
          <p className="text-sm mt-1">Click "Add Vehicle" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={dragOverIndex === index ? 'opacity-50' : ''}
            >
              <QueueItemRow
                item={item}
                isSpecialty={isSpecialty}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onCreateAlert={handleCreateAlert}
                isDragging={draggedItem?.id === item.id}
                dragHandleProps={{
                  onMouseDown: (e) => e.stopPropagation(),
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add vehicle dialog */}
      <AddVehicleToQueueDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        vehicles={vehicles}
        existingVehicleIds={existingVehicleIds}
        isSpecialty={isSpecialty}
        onAdd={handleAddVehicle}
      />
    </div>
  );
}
