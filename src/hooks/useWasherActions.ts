import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DamageReport {
  id: string;
  vehicle_id: string;
  queue_item_id: string | null;
  started_by: string;
  started_at: string;
  damage_type: 'SCRATCH' | 'DENT' | 'INTERIOR' | 'GLASS' | 'OTHER';
  damage_location: string | null;
  notes: string | null;
  status: 'OPEN' | 'SUBMITTED' | 'CLOSED';
  submitted_at: string | null;
}

export interface DamagePhoto {
  id: string;
  damage_report_id: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export function useWasherActions() {
  const queryClient = useQueryClient();

  // Mark item as clean
  const markClean = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cleaning_queue_items')
        .update({
          status: 'CLEAN',
          cleaned_by: user.id,
          cleaned_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-queue-items'] });
      toast.success('Marked as clean!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark as clean');
    },
  });

  // Acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('alert_acknowledgements')
        .insert({
          alert_id: alertId,
          acknowledged_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Alert already acknowledged');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-acknowledgements'] });
      toast.success('Alert acknowledged');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to acknowledge alert');
    },
  });

  // Create damage report
  const createDamageReport = useMutation({
    mutationFn: async ({
      vehicleId,
      queueItemId,
      damageType,
      damageLocation,
      notes,
      status = 'SUBMITTED',
    }: {
      vehicleId: string;
      queueItemId?: string | null;
      damageType: DamageReport['damage_type'];
      damageLocation?: string | null;
      notes?: string | null;
      status?: 'OPEN' | 'SUBMITTED';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('damage_reports')
        .insert({
          vehicle_id: vehicleId,
          queue_item_id: queueItemId,
          started_by: user.id,
          damage_type: damageType,
          damage_location: damageLocation,
          notes,
          status,
          submitted_at: status === 'SUBMITTED' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DamageReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-reports'] });
      toast.success('Damage report submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create damage report');
    },
  });

  // Upload damage photo
  const uploadDamagePhoto = useMutation({
    mutationFn: async ({
      damageReportId,
      file,
    }: {
      damageReportId: string;
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${damageReportId}/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('damage-photos')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('damage_photos')
        .insert({
          damage_report_id: damageReportId,
          storage_path: filename,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DamagePhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-photos'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload photo');
    },
  });

  return {
    markClean,
    acknowledgeAlert,
    createDamageReport,
    uploadDamagePhoto,
  };
}

// Hook to get alerts for queue items
export function useQueueItemAlerts(queueItemIds: string[]) {
  return useQuery({
    queryKey: ['queue-alerts-batch', queueItemIds],
    queryFn: async () => {
      if (queueItemIds.length === 0) return [];

      const { data, error } = await supabase
        .from('queue_alerts')
        .select(`
          *,
          acknowledgement:alert_acknowledgements(*)
        `)
        .in('queue_item_id', queueItemIds)
        .is('resolved_at', null);

      if (error) throw error;
      return data;
    },
    enabled: queueItemIds.length > 0,
  });
}
