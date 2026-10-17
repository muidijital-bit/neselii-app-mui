import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
        .select(
          'created_at, listing:listings(id, title, price, currency, brand, model, year, km, fuel_type, transmission, city, district, status, is_featured, cover_image_url, created_at)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.flatMap((f) => (f.listing ? [f.listing] : []));
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
