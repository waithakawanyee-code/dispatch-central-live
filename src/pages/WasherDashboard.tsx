import { useState, useMemo } from 'react';
import { Droplets, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WasherQueueCard } from '@/components/washer/WasherQueueCard';
import { DamageReportDialog } from '@/components/washer/DamageReportDialog';
import { useCleaningQueues, useCleaningQueueItems } from '@/hooks/useCleaningQueues';
import { useWasherActions, useQueueItemAlerts } from '@/hooks/useWasherActions';
import { getTodayInNY, formatNYDate, APP_TIMEZONE } from '@/lib/timezone';
import type { CleaningQueueItem } from '@/hooks/useCleaningQueues';

export default function WasherDashboard() {
  const today = getTodayInNY();
  const { queues, isLoading: queuesLoading } = useCleaningQueues(today);

  // Find queue IDs
  const specialtyQueue = useMemo(
    () => queues.find((q) => q.queue_type === 'SPECIALTY'),
    [queues]
  );
  const generalQueue = useMemo(
    () => queues.find((q) => q.queue_type === 'GENERAL'),
    [queues]
  );

  const { items: specialtyItems, isLoading: specialtyLoading } = useCleaningQueueItems(specialtyQueue?.id || null);
  const { items: generalItems, isLoading: generalLoading } = useCleaningQueueItems(generalQueue?.id || null);

  // Get all queue item IDs for alert fetching
  const allItemIds = useMemo(
    () => [...specialtyItems, ...generalItems].map((item) => item.id),
    [specialtyItems, generalItems]
  );

  const { data: alerts } = useQueueItemAlerts(allItemIds);

  // Create alert map for quick lookup
  const alertMap = useMemo(() => {
    const map = new Map();
    alerts?.forEach((alert) => {
      // Only keep the most recent alert per item
      if (!map.has(alert.queue_item_id) || new Date(alert.created_at) > new Date(map.get(alert.queue_item_id).created_at)) {
        map.set(alert.queue_item_id, alert);
      }
    });
    return map;
  }, [alerts]);

  const { markClean, acknowledgeAlert } = useWasherActions();

  // Damage report dialog state
  const [damageReportItem, setDamageReportItem] = useState<CleaningQueueItem | null>(null);

  // Refresh function
  const handleRefresh = () => {
    window.location.reload();
  };

  const isLoading = queuesLoading || specialtyLoading || generalLoading;

  // Filter to show pending items first, then clean
  const sortItems = (items: CleaningQueueItem[]) => {
    return [...items].sort((a, b) => {
      if (a.status === 'PENDING' && b.status === 'CLEAN') return -1;
      if (a.status === 'CLEAN' && b.status === 'PENDING') return 1;
      return a.position - b.position;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Droplets className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Car Washer</h1>
              <p className="text-sm text-muted-foreground">{formatNYDate(today)}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            className="h-12 px-4"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading queues...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Specialty Queue */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-amber-500">⏰ Specialty Queue</h2>
                <span className="text-sm text-muted-foreground">
                  ({specialtyItems.filter((i) => i.status === 'PENDING').length} pending)
                </span>
              </div>

              {specialtyItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl text-muted-foreground">
                  No specialty vehicles in queue
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortItems(specialtyItems).map((item) => (
                    <WasherQueueCard
                      key={item.id}
                      item={item}
                      alert={alertMap.get(item.id)}
                      onMarkClean={() => markClean.mutate(item.id)}
                      onAcknowledgeAlert={(alertId) => acknowledgeAlert.mutate(alertId)}
                      onReportDamage={() => setDamageReportItem(item)}
                      isMarkingClean={markClean.isPending}
                      isAcknowledging={acknowledgeAlert.isPending}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* General Queue */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-blue-500">🚗 General Queue</h2>
                <span className="text-sm text-muted-foreground">
                  ({generalItems.filter((i) => i.status === 'PENDING').length} pending)
                </span>
              </div>

              {generalItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl text-muted-foreground">
                  No general vehicles in queue
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortItems(generalItems).map((item) => (
                    <WasherQueueCard
                      key={item.id}
                      item={item}
                      alert={alertMap.get(item.id)}
                      onMarkClean={() => markClean.mutate(item.id)}
                      onAcknowledgeAlert={(alertId) => acknowledgeAlert.mutate(alertId)}
                      onReportDamage={() => setDamageReportItem(item)}
                      isMarkingClean={markClean.isPending}
                      isAcknowledging={acknowledgeAlert.isPending}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Damage Report Dialog */}
      {damageReportItem && (
        <DamageReportDialog
          open={!!damageReportItem}
          onOpenChange={(open) => !open && setDamageReportItem(null)}
          vehicleId={damageReportItem.vehicle_id}
          vehicleUnit={damageReportItem.vehicle?.unit || 'Unknown'}
          queueItemId={damageReportItem.id}
          onComplete={() => setDamageReportItem(null)}
        />
      )}
    </div>
  );
}
