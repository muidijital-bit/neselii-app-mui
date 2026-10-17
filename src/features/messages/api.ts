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
      const [conversations, unread] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, listing:listings(id, title, price, currency, cover_url)')
          .order('last_message_at', { ascending: false }),
        supabase.from('conversation_unread').select('*'),
      ]);
      if (conversations.error) throw conversations.error;
      if (unread.error) throw unread.error;
      const counts = new Map(unread.data.map((u) => [u.conversation_id, u.unread_count]));
      return conversations.data.map((c) => ({ ...c, unread_count: counts.get(c.id) ?? 0 }));
    },
  });
}

export function useUnreadMessageCount() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['unread-messages', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('conversation_unread').select('unread_count');
      if (error) throw error;
      return data.reduce((sum, row) => sum + row.unread_count, 0);
    },
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, listing:listings(id, title, price, currency, cover_url)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const message = payload.new as MessageRow;
          queryClient.setQueryData<MessageRow[]>(['messages', conversationId], (prev = []) =>
            prev.some((m) => m.id === message.id)
              ? prev.map((m) => (m.id === message.id ? message : m))
              : [...prev, message],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['messages', conversationId],
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

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });
}

/** İlan için mevcut konuşmayı döndürür, yoksa oluşturur. */
export function useStartConversation() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!userId) throw new Error('Mesaj göndermek için giriş yapın');
      const existing = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return existing.data.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ listing_id: listingId, user_id: userId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
  });
}
