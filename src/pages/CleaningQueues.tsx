import { useState, useEffect, useMemo } from 'react';
import { CalendarIcon, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { QueueList } from '@/components/cleaning/QueueList';
import { useCleaningQueues, type QueueType } from '@/hooks/useCleaningQueues';
import { useDispatchData } from '@/hooks/useDispatchData';
import { getTodayInNY, formatNYDate, APP_TIMEZONE } from '@/lib/timezone';
import { cn } from '@/lib/utils';

export default function CleaningQueues() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayInNY());
  const [activeTab, setActiveTab] = useState<QueueType>('SPECIALTY');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { queues, isLoading: queuesLoading, getOrCreateQueue } = useCleaningQueues(selectedDate);
  const { vehicles, loading: vehiclesLoading } = useDispatchData();

  // Get or create queues for both types when date changes
  useEffect(() => {
    const ensureQueues = async () => {
      // Create both queue types for the selected date
      await getOrCreateQueue.mutateAsync({ queueDate: selectedDate, queueType: 'SPECIALTY' });
      await getOrCreateQueue.mutateAsync({ queueDate: selectedDate, queueType: 'GENERAL' });
    };
    ensureQueues();
  }, [selectedDate]);

  // Find queue IDs
  const specialtyQueue = useMemo(
    () => queues.find((q) => q.queue_type === 'SPECIALTY'),
    [queues]
  );
  const generalQueue = useMemo(
    () => queues.find((q) => q.queue_type === 'GENERAL'),
    [queues]
  );

  // Filter active vehicles only
  const activeVehicles = useMemo(
    () =>
      (vehicles || [])
        .filter((v) => v.status === 'active' || v.status === 'out-of-service')
        .map((v) => ({
          id: v.id,
          unit: v.unit,
          classification: v.primary_category || 'fleet',
          status: v.status,
        })),
    [vehicles]
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Format to YYYY-MM-DD in NY timezone
      const nyDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
      setSelectedDate(nyDate);
      setCalendarOpen(false);
    }
  };

  const isToday = selectedDate === getTodayInNY();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Droplets className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cleaning Queues</h1>
              <p className="text-sm text-muted-foreground">Dispatcher View</p>
            </div>
          </div>

          {/* Date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal min-w-[200px]',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {isToday ? (
                  <span>
                    Today <span className="text-muted-foreground">({formatNYDate(selectedDate)})</span>
                  </span>
                ) : (
                  formatNYDate(selectedDate)
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={new Date(selectedDate + 'T12:00:00')}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Queue tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QueueType)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="SPECIALTY" className="gap-2">
              <span className="font-semibold">Specialty</span>
              <span className="text-xs text-muted-foreground">
                (Out time required)
              </span>
            </TabsTrigger>
            <TabsTrigger value="GENERAL">
              <span className="font-semibold">General</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="SPECIALTY" className="mt-0">
            <QueueList
              queueId={specialtyQueue?.id || null}
              queueType="SPECIALTY"
              vehicles={activeVehicles}
              isLoading={queuesLoading || vehiclesLoading}
            />
          </TabsContent>

          <TabsContent value="GENERAL" className="mt-0">
            <QueueList
              queueId={generalQueue?.id || null}
              queueType="GENERAL"
              vehicles={activeVehicles}
              isLoading={queuesLoading || vehiclesLoading}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
