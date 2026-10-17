import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { ProfileRow, ProfileUpdate } from '@/types/database';

export function useProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      if (!userId) throw new Error('Giriş yapılmamış');
      const { data, error } = await supabase.from('profiles').update(update).eq('id', userId).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (update) => {
      // Anahtarlar anında değişsin
      const key = ['profile', userId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProfileRow>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...update });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(['profile', userId], context.previous);
    },
    onSuccess: (profile) => queryClient.setQueryData(['profile', userId], profile),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      // Kullanıcı silinse de mevcut erişim anahtarı süresi dolana kadar geçerlidir;
      // cihazdaki oturumu hemen kapat.
      await supabase.auth.signOut({ scope: 'local' });
    },
  });
}
