import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SearchState } from '@/features/listings/search-store';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function useSavedSearches() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['saved-searches', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSearch() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, search }: { name: string; search: SearchState }) => {
      if (!userId) throw new Error('Giriş yapılmamış');
      const { error } = await supabase.from('saved_searches').insert({
        user_id: userId,
        name,
        query: search.query.trim() || null,
        filters: search.filters,
        sort: search.sort,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
}
