import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LISTING_SUMMARY_COLUMNS, type ListingSummary } from '@/features/listings/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function useFavoriteIds() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['favorite-ids', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('listing_id');
      if (error) throw error;
      return new Set(data.map((f) => f.listing_id));
    },
  });
}

export function useFavorites() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select(`created_at, listing:listings(${LISTING_SUMMARY_COLUMNS})`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Yayından kalkan ilanlar RLS nedeniyle null gelir
      return data.flatMap((f) => (f.listing ? [f.listing as unknown as ListingSummary] : []));
    },
  });
}

export function useToggleFavorite() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) => {
      if (!userId) throw new Error('Favorilere eklemek için giriş yapın');
      const { error } = isFavorite
        ? await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId)
        : await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });
      if (error) throw error;
    },
    onMutate: async ({ listingId, isFavorite }) => {
      // Kalp simgesi anında değişsin
      const key = ['favorite-ids', userId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Set<string>>(key);
      const next = new Set(previous);
      if (isFavorite) next.delete(listingId);
      else next.add(listingId);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_e, _v, context) => {
      queryClient.setQueryData(['favorite-ids', userId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
