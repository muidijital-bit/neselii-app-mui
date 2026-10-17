import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: ['announcement', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });
}
