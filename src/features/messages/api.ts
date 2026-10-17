import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { MessageRow } from '@/types/database';

export function useConversations() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          '*, listing:listings(id, title, cover_image_url), buyer:profiles!conversations_buyer_id_fkey(id, full_name), seller:profiles!conversations_seller_id_fkey(id, full_name)',
        )
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const message = payload.new as MessageRow;
          queryClient.setQueryData<MessageRow[]>(['messages', conversationId], (prev = []) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage(conversationId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error('Mesaj göndermek için giriş yapın');
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: userId, body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<MessageRow[]>(['messages', conversationId], (prev = []) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** İlan için mevcut konuşmayı döndürür, yoksa oluşturur. */
export function useStartConversation() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async ({ listingId, sellerId }: { listingId: string; sellerId: string }) => {
      if (!userId) throw new Error('Mesaj göndermek için giriş yapın');
      const existing = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', userId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return existing.data.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ listing_id: listingId, buyer_id: userId, seller_id: sellerId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
  });
}
