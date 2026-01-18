import { useState } from 'react';
import { GripVertical, AlertTriangle, Bell, Trash2, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatNYTimestamp } from '@/lib/timezone';
import type { CleaningQueueItem, QueueItemUrgency } from '@/hooks/useCleaningQueues';

interface QueueItemRowProps {
  item: CleaningQueueItem;
  isSpecialty: boolean;
  onUpdate: (itemId: string, updates: Partial<Pick<CleaningQueueItem, 'out_at' | 'urgency' | 'dispatcher_notes'>>) => void;
  onRemove: (itemId: string) => void;
  onCreateAlert: (itemId: string, message?: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function QueueItemRow({
  item,
  isSpecialty,
  onUpdate,
  onRemove,
  onCreateAlert,
  dragHandleProps,
  isDragging,
}: QueueItemRowProps) {
  const [notes, setNotes] = useState(item.dispatcher_notes || '');
  const [alertMessage, setAlertMessage] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const urgencyColors: Record<QueueItemUrgency, string> = {
    NORMAL: 'bg-muted text-muted-foreground',
    HIGH: 'bg-amber-500/20 text-amber-600 border-amber-500/50',
    CRITICAL: 'bg-red-500/20 text-red-600 border-red-500/50',
  };

  const handleNoteSave = () => {
    onUpdate(item.id, { dispatcher_notes: notes || null });
    setNotesOpen(false);
  };

  const handleAlertSend = () => {
    onCreateAlert(item.id, alertMessage || undefined);
    setAlertMessage('');
    setAlertOpen(false);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg',
        item.status === 'CLEAN' && 'bg-green-500/10 border-green-500/30',
        item.urgency === 'CRITICAL' && 'border-red-500/50',
        item.urgency === 'HIGH' && 'border-amber-500/50'
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Position */}
      <span className="w-6 text-center text-xs font-mono text-muted-foreground">
        {item.position}
      </span>

      {/* Vehicle unit */}
      <div className="flex-1 min-w-0">
        <span className="font-mono font-semibold text-sm">
          {item.vehicle?.unit || 'Unknown'}
        </span>
        {item.dispatcher_notes && (
          <MessageSquare className="inline-block ml-1 h-3 w-3 text-blue-500" />
        )}
      </div>

      {/* Out At (required for Specialty) */}
      {isSpecialty && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <Input
            type="time"
            value={item.out_at ? new Date(item.out_at).toTimeString().slice(0, 5) : ''}
            onChange={(e) => {
              if (e.target.value) {
                const today = new Date().toISOString().split('T')[0];
                onUpdate(item.id, { out_at: `${today}T${e.target.value}:00` });
              } else {
                onUpdate(item.id, { out_at: null });
              }
            }}
            className="w-24 h-7 text-xs"
            placeholder="Out at"
          />
        </div>
      )}

      {/* Urgency */}
      <Select
        value={item.urgency}
        onValueChange={(value: QueueItemUrgency) => onUpdate(item.id, { urgency: value })}
      >
        <SelectTrigger className={cn('w-24 h-7 text-xs', urgencyColors[item.urgency])}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NORMAL">Normal</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
        </SelectContent>
      </Select>

      {/* Status badge */}
      <Badge
        variant={item.status === 'CLEAN' ? 'default' : 'secondary'}
        className={cn(
          'w-16 justify-center text-xs',
          item.status === 'CLEAN' && 'bg-green-600'
        )}
      >
        {item.status}
      </Badge>

      {/* Cleaned at */}
      {item.cleaned_at && (
        <span className="text-xs text-muted-foreground">
          {formatNYTimestamp(item.cleaned_at)}
        </span>
      )}

      {/* Notes popover */}
      <Popover open={notesOpen} onOpenChange={setNotesOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <MessageSquare className={cn('h-4 w-4', item.dispatcher_notes && 'text-blue-500')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Dispatcher Notes</h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for this vehicle..."
              className="min-h-[80px]"
            />
            <Button size="sm" onClick={handleNoteSave} className="w-full">
              Save Notes
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Alert button */}
      <Popover open={alertOpen} onOpenChange={setAlertOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">Send Alert to Washer</h4>
            </div>
            <Textarea
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Optional message..."
              className="min-h-[60px]"
            />
            <Button
              size="sm"
              onClick={handleAlertSend}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              Send Alert
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
