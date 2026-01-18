import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTodayInNY } from '@/lib/timezone';

export type QueueType = 'SPECIALTY' | 'GENERAL';
export type QueueItemUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type QueueItemStatus = 'PENDING' | 'CLEAN';

export interface CleaningQueue {
  id: string;
  queue_date: string;
  queue_type: QueueType;
  created_by: string | null;
  created_at: string;
}

export interface CleaningQueueItem {
  id: string;
  queue_id: string;
  vehicle_id: string;
  position: number;
  out_at: string | null;
  dispatcher_notes: string | null;
  urgency: QueueItemUrgency;
  status: QueueItemStatus;
  cleaned_by: string | null;
  cleaned_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  vehicle?: {
    id: string;
    unit: string;
    classification: string;
  };
}

export interface QueueAlert {
  id: string;
  queue_item_id: string;
  alert_message: string | null;
  alert_level: 'URGENT';
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useCleaningQueues(date: string = getTodayInNY()) {
  const queryClient = useQueryClient();

  // Fetch or create queues for a given date
  const queuesQuery = useQuery({
    queryKey: ['cleaning-queues', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cleaning_queues')
        .select('*')
        .eq('queue_date', date);

      if (error) throw error;
      return data as CleaningQueue[];
    },
  });

  // Get or create a queue for a specific type
  const getOrCreateQueue = useMutation({
    mutationFn: async ({ queueDate, queueType }: { queueDate: string; queueType: QueueType }) => {
      // First try to find existing
      const { data: existing } = await supabase
        .from('cleaning_queues')
        .select('*')
        .eq('queue_date', queueDate)
        .eq('queue_type', queueType)
        .single();

      if (existing) return existing as CleaningQueue;

      // Create new queue
      const { data, error } = await supabase
        .from('cleaning_queues')
        .insert({ queue_date: queueDate, queue_type: queueType })
        .select()
        .single();

      if (error) throw error;
      return data as CleaningQueue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queues', date] });
    },
  });

  return {
    queues: queuesQuery.data || [],
    isLoading: queuesQuery.isLoading,
    error: queuesQuery.error,
    getOrCreateQueue,
  };
}

export function useCleaningQueueItems(queueId: string | null) {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['cleaning-queue-items', queueId],
    queryFn: async () => {
      if (!queueId) return [];

      const { data, error } = await supabase
        .from('cleaning_queue_items')
        .select(`
          *,
          vehicle:vehicles(id, unit, classification)
        `)
        .eq('queue_id', queueId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as CleaningQueueItem[];
    },
    enabled: !!queueId,
  });

  const addItem = useMutation({
    mutationFn: async ({
      queueId,
      vehicleId,
      outAt,
      urgency = 'NORMAL',
      dispatcherNotes,
    }: {
      queueId: string;
      vehicleId: string;
      outAt?: string | null;
      urgency?: QueueItemUrgency;
      dispatcherNotes?: string | null;
    }) => {
      // Get max position
      const { data: items } = await supabase
        .from('cleaning_queue_items')
        .select('position')
        .eq('queue_id', queueId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (items?.[0]?.position ?? 0) + 1;

      const { data, error } = await supabase
        .from('cleaning_queue_items')
        .insert({
          queue_id: queueId,
          vehicle_id: vehicleId,
          position: nextPosition,
          out_at: outAt,
          urgency,
          dispatcher_notes: dispatcherNotes,
        })
        .select(`
          *,
          vehicle:vehicles(id, unit, classification)
        `)
        .single();

      if (error) throw error;
      return data as CleaningQueueItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queue-items', queueId] });
      toast.success('Vehicle added to queue');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast.error('Vehicle is already in this queue');
      } else {
        toast.error('Failed to add vehicle');
      }
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<Pick<CleaningQueueItem, 'out_at' | 'urgency' | 'dispatcher_notes' | 'position'>>;
    }) => {
      const { data, error } = await supabase
        .from('cleaning_queue_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queue-items', queueId] });
    },
    onError: () => {
      toast.error('Failed to update item');
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('cleaning_queue_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queue-items', queueId] });
      toast.success('Vehicle removed from queue');
    },
    onError: () => {
      toast.error('Failed to remove vehicle');
    },
  });

  const reorderItems = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      // Update positions in batch
      const updates = items.map(({ id, position }) =>
        supabase
          .from('cleaning_queue_items')
          .update({ position })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queue-items', queueId] });
    },
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}

export function useQueueAlerts(queueItemId: string | null) {
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['queue-alerts', queueItemId],
    queryFn: async () => {
      if (!queueItemId) return [];

      const { data, error } = await supabase
        .from('queue_alerts')
        .select('*')
        .eq('queue_item_id', queueItemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QueueAlert[];
    },
    enabled: !!queueItemId,
  });

  const createAlert = useMutation({
    mutationFn: async ({
      queueItemId,
      alertMessage,
    }: {
      queueItemId: string;
      alertMessage?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('queue_alerts')
        .insert({
          queue_item_id: queueItemId,
          alert_message: alertMessage,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QueueAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-alerts'] });
      toast.success('Alert sent to washer');
    },
    onError: () => {
      toast.error('Failed to create alert');
    },
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    createAlert,
  };
}
