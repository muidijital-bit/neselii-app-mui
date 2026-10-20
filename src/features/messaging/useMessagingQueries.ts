import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { asConversationId } from '@/domain';
import { notificationKeys } from '@/features/notifications/useNotificationsQueries';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

/**
 * Sorgu kapsamı (listings ile aynı kural): yalnızca oturum hazır VE e-posta doğrulanmışken çalışır; anahtara kullanıcı kimliği girer,
 * böylece başka kullanıcının girişinde önceki kullanıcının sohbet/sayaç önbelleği paylaşılmaz. Çıkışta `useSignOut` tüm önbelleği boşaltır.
 */
function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const messagingKeys = {
  all: (userId: string | null) => ['messaging', userId] as const,
  conversations: (userId: string | null) => [...messagingKeys.all(userId), 'conversations'] as const,
  unread: (userId: string | null) => [...messagingKeys.all(userId), 'unread'] as const,
  messages: (userId: string | null, conversationId: string) => [...messagingKeys.all(userId), 'messages', conversationId] as const,
  /** Tek sohbet özeti (ilan kartı): "Mesaj Gönder" akışı açılışta doldurur, sohbet ekranı ilk karede kullanır. */
  conversation: (userId: string | null, conversationId: string) => [...messagingKeys.all(userId), 'conversation', conversationId] as const,
};

/** Sohbet listesi (09): `updatedAt` azalan, 20'şerli sayfalar. */
export function useConversationsQuery() {
  const { messaging } = useServices();
  const { enabled, userId } = useQueryScope();
  return useInfiniteQuery({
    queryKey: messagingKeys.conversations(userId),
    queryFn: ({ pageParam }) => messaging.listConversations({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/** Tüm sohbetlerdeki okunmamış toplam (Mesajlar sekmesi rozeti); liste satır sayaçlarının toplamıyla aynı kaynaktan (servis) gelir. */
export function useUnreadCountQuery() {
  const { messaging } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: messagingKeys.unread(userId), queryFn: () => messaging.countUnread(), enabled });
}

/** Sohbetin mesajları (10): ilk sayfa EN YENİ 20 mesaj; sonraki sayfalar daha eskidir (`pages[0]` en yeni). Sayfa içi sıra eskiden yeniye. */
export function useMessagesQuery(conversationId: string) {
  const { messaging } = useServices();
  const { enabled, userId } = useQueryScope();
  return useInfiniteQuery({
    queryKey: messagingKeys.messages(userId, conversationId),
    queryFn: ({ pageParam }) => messaging.listMessages({ conversationId: asConversationId(conversationId), cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && conversationId !== '',
    // Sohbet ekranı unmount iken (liste/başka ekran) gelen yanıtlar önbelleğe işlenmez: her açılışta sunucudan yeniden al (30 sn staleTime yok).
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/**
 * Sohbeti okundu işaretler ve liste + rozet önbelleğini yeniler. Sohbet ekranı açılışta kullanır.
 * Başarısızlıkta sayaç eski haliyle kalır (iyimser güncelleme yok): ekran ile servis ayrışmaz.
 */
export function useMarkConversationRead() {
  const { messaging } = useServices();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => messaging.markConversationRead(asConversationId(conversationId)),
    // Sunucu sohbete ait mesaj bildirimlerini de okundu yapar: bildirim listesi ve rozeti de yenilenir.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) }),
        queryClient.invalidateQueries({ queryKey: messagingKeys.unread(userId) }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
      ]),
  });
}
