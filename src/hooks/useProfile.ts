import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ProfileRole = 'ADMIN' | 'DISPATCHER' | 'WASHER' | 'USER';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  active: boolean;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (new user)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isWasher: profileQuery.data?.role === 'WASHER',
    isDispatcher: profileQuery.data?.role === 'DISPATCHER' || profileQuery.data?.role === 'ADMIN',
    isAdmin: profileQuery.data?.role === 'ADMIN',
    role: profileQuery.data?.role || null,
  };
}
