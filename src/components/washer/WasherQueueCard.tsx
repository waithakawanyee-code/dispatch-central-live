import { Bell, CheckCircle, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNYTimestamp } from '@/lib/timezone';
import type { CleaningQueueItem, QueueItemUrgency } from '@/hooks/useCleaningQueues';

interface QueueAlert {
  id: string;
  alert_message: string | null;
  created_at: string;
  acknowledgement?: { acknowledged_at: string }[] | null;
}

interface WasherQueueCardProps {
  item: CleaningQueueItem;
  alert?: QueueAlert | null;
  onMarkClean: () => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onReportDamage: () => void;
  isMarkingClean?: boolean;
  isAcknowledging?: boolean;
}

export function WasherQueueCard({
  item,
  alert,
  onMarkClean,
  onAcknowledgeAlert,
  onReportDamage,
  isMarkingClean,
  isAcknowledging,
}: WasherQueueCardProps) {
  const isClean = item.status === 'CLEAN';
  const hasUnacknowledgedAlert = alert && (!alert.acknowledgement || alert.acknowledgement.length === 0);
  const acknowledgedAt = alert?.acknowledgement?.[0]?.acknowledged_at;

  const urgencyStyles: Record<QueueItemUrgency, { bg: string; text: string; border: string }> = {
    NORMAL: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
    HIGH: { bg: 'bg-amber-500/20', text: 'text-amber-600', border: 'border-amber-500' },
    CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500' },
  };

  const style = urgencyStyles[item.urgency];

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-4 transition-all',
        isClean ? 'bg-green-500/10 border-green-500' : style.border,
        hasUnacknowledgedAlert && 'ring-2 ring-amber-500 ring-offset-2 animate-pulse'
      )}
    >
      {/* Alert indicator */}
      {hasUnacknowledgedAlert && (
        <div className="absolute -top-2 -right-2 p-2 bg-amber-500 rounded-full animate-bounce">
          <Bell className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Position badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">{item.position}</span>
      </div>

      {/* Vehicle unit - large and prominent */}
      <div className="text-center mb-4 pt-2">
        <h2 className="text-4xl font-mono font-bold tracking-tight">
          {item.vehicle?.unit || 'Unknown'}
        </h2>
        
        {/* Status indicator */}
        {isClean ? (
          <Badge className="mt-2 bg-green-600 text-white text-lg px-4 py-1">
            <Sparkles className="h-4 w-4 mr-1" />
            CLEAN
          </Badge>
        ) : (
          <Badge className={cn('mt-2 text-lg px-4 py-1', style.bg, style.text)}>
            {item.urgency}
          </Badge>
        )}
      </div>

      {/* Out at time */}
      {item.out_at && (
        <div className="flex items-center justify-center gap-2 mb-3 text-lg">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="font-mono font-semibold">
            Out: {formatNYTimestamp(item.out_at)}
          </span>
        </div>
      )}

      {/* Dispatcher notes */}
      {item.dispatcher_notes && (
        <div className="bg-blue-500/10 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {item.dispatcher_notes}
          </p>
        </div>
      )}

      {/* Alert message */}
      {alert && (
        <div className={cn(
          'rounded-lg p-3 mb-4',
          hasUnacknowledgedAlert ? 'bg-amber-500/20' : 'bg-muted'
        )}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn(
              'h-5 w-5 mt-0.5',
              hasUnacknowledgedAlert ? 'text-amber-500' : 'text-muted-foreground'
            )} />
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                hasUnacknowledgedAlert ? 'text-amber-600' : 'text-muted-foreground'
              )}>
                {alert.alert_message || 'Urgent attention needed!'}
              </p>
              {acknowledgedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Acknowledged at {formatNYTimestamp(acknowledgedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cleaned info */}
      {isClean && item.cleaned_at && (
        <div className="text-center text-sm text-muted-foreground mb-4">
          Cleaned at {formatNYTimestamp(item.cleaned_at)}
        </div>
      )}

      {/* Action buttons - large touch targets */}
      <div className="space-y-3">
        {/* Acknowledge alert button */}
        {hasUnacknowledgedAlert && (
          <Button
            onClick={() => onAcknowledgeAlert(alert.id)}
            disabled={isAcknowledging}
            className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-600"
          >
            <Bell className="h-5 w-5 mr-2" />
            {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
          </Button>
        )}

        {/* Mark clean button */}
        {!isClean && (
          <Button
            onClick={onMarkClean}
            disabled={isMarkingClean}
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {isMarkingClean ? 'Marking Clean...' : 'Mark Clean'}
          </Button>
        )}

        {/* Report damage button */}
        <Button
          onClick={onReportDamage}
          variant="outline"
          className="w-full h-12 text-base border-destructive text-destructive hover:bg-destructive/10"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report Damage
        </Button>
      </div>
    </div>
  );
}
