import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { appError, asConversationId, type Conversation, type Page } from '@/domain';
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
  /** Sohbet gizleme mutasyonları (eşzamanlı silmelerde yalnız sonuncusu listeyi sunucuyla eşitler). */
  hide: ['messaging', 'hide'] as const,
};

type ConversationsData = InfiniteData<Page<Conversation>, string | undefined>;

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

type HideVariables = {
  readonly conversationId: string;
  /** Mutasyonu başlatan kullanıcı: geri alma/eşitleme yalnızca KENDİ önbelleğine yazılır. */
  readonly userId: string;
  /** Eylem anındaki oturum kanıtı (`beginOperation`): çıkış/kullanıcı değişiminden sonra servis çağrılmaz. */
  readonly isCurrent: () => boolean;
};

type HideContext = { readonly removed: { readonly conversation: Conversation; readonly page: number; readonly index: number } | null };

function findConversation(data: ConversationsData | undefined, conversationId: string): HideContext['removed'] {
  for (const [page, { items }] of (data?.pages ?? []).entries()) {
    const index = items.findIndex((item) => item.id === conversationId);
    if (index !== -1) return { conversation: items[index], page, index };
  }
  return null;
}

/**
 * Sohbeti listeden kaldırır (müşteride kendi listesinden, yöneticide firma gelen kutusundan; kayıt silinmez). İYİMSER: satır hemen
 * kaybolur ve sekme rozeti satırın okunmamışı kadar düşer; servis hata verirse yalnız bu satır yerine döner ve rozet geri eklenir
 * (eşzamanlı başka silme ezilmez). Hata (geri almadan sonra) `onError` ile ekrana iletilir. Son işlem bitince liste, rozet ve bildirimler (sunucu
 * sohbetin mesaj bildirimlerini okundu yapar) eşitlenir.
 */
export function useHideConversation({ onError }: { readonly onError?: (error: unknown) => void } = {}) {
  // `mutate` düzeyi geri çağırmalar ardışık çağrılarda yalnız sonuncu için çalışır; hata bildirimi mutasyon düzeyinden en güncel geri çağırmaya gider.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const { messaging } = useServices();
  const { beginOperation } = useSession();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();

  const mutation = useMutation<void, unknown, HideVariables, HideContext>({
    mutationKey: messagingKeys.hide,
    mutationFn: ({ conversationId, isCurrent }) => {
      if (!isCurrent()) return Promise.reject(appError.unauthenticated());
      return messaging.hideConversation(asConversationId(conversationId));
    },
    onMutate: async ({ conversationId, userId: owner }) => {
      const key = messagingKeys.conversations(owner);
      await queryClient.cancelQueries({ queryKey: key });
      const current = queryClient.getQueryData<ConversationsData>(key);
      const removed = findConversation(current, conversationId);
      if (!current || !removed) return { removed: null };
      queryClient.setQueryData<ConversationsData>(key, {
        ...current,
        pages: current.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== conversationId) })),
      });
      const unread = removed.conversation.unreadCount;
      if (unread > 0) queryClient.setQueryData<number>(messagingKeys.unread(owner), (count) => (count === undefined ? count : Math.max(0, count - unread)));
      return { removed };
    },
    onError: (error, { conversationId, userId: owner, isCurrent }, context) => {
      // Başka oturumun ekranına eski hesabın hatası yazılmaz (eski kullanıcının önbelleği aşağıda yine geri alınır).
      if (isCurrent()) onErrorRef.current?.(error);
      const removed = context?.removed;
      if (!removed) return;
      const key = messagingKeys.conversations(owner);
      queryClient.setQueryData<ConversationsData>(key, (current) => {
        if (!current || current.pages.some((page) => page.items.some((item) => item.id === conversationId))) return current;
        const pages = current.pages.map((page, pageIndex) => {
          if (pageIndex !== Math.min(removed.page, current.pages.length - 1)) return page;
          const items = [...page.items];
          items.splice(Math.min(removed.index, items.length), 0, removed.conversation);
          return { ...page, items };
        });
        return { ...current, pages };
      });
      const unread = removed.conversation.unreadCount;
      if (unread > 0) queryClient.setQueryData<number>(messagingKeys.unread(owner), (count) => (count === undefined ? count : count + unread));
    },
    onSettled: (_data, _error, { userId: owner }) => {
      // Son işlem eşitler: eşzamanlı iyimser silme sunucu yanıtıyla geri sıçramasın.
      if (queryClient.isMutating({ mutationKey: messagingKeys.hide }) > 1) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(owner) }),
        queryClient.invalidateQueries({ queryKey: messagingKeys.unread(owner) }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all(owner) }),
      ]);
    },
  });

  const { mutate } = mutation;
  /** Oturum yoksa hiçbir şey yapmaz. */
  const hide = useCallback(
    (conversationId: string) => {
      if (!userId) return;
      mutate({ conversationId, userId, isCurrent: beginOperation() });
    },
    [mutate, userId, beginOperation],
  );
  return { hide, isPending: mutation.isPending };
}
