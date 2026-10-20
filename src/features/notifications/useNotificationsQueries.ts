import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appError, asNotificationId } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

import { collectUnreadIds } from './collectUnread';

/**
 * Sorgu kapsamı (listings/messaging ile aynı kural): yalnızca oturum hazır VE e-posta doğrulanmışken çalışır; anahtara kullanıcı kimliği
 * girer, böylece başka kullanıcının girişinde önceki kullanıcının bildirim/sayaç önbelleği paylaşılmaz. Çıkışta `useSignOut` önbelleği boşaltır.
 */
function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const notificationKeys = {
  all: (userId: string | null) => ['notifications', userId] as const,
  list: (userId: string | null) => [...notificationKeys.all(userId), 'list'] as const,
  unread: (userId: string | null) => [...notificationKeys.all(userId), 'unread'] as const,
};

/** Bildirim listesi (11): en yeni önce, 20'şerli sayfalar. */
export function useNotificationsQuery() {
  const { notifications } = useServices();
  const { enabled, userId } = useQueryScope();
  return useInfiniteQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: ({ pageParam }) => notifications.list({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/** Okunmamış bildirim sayısı (Bildirimler sekmesi rozeti, ana sayfa zili); liste satırlarındaki okunmamışların toplamıyla aynı kaynak (servis). */
export function useNotificationUnreadCountQuery() {
  const { notifications } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: notificationKeys.unread(userId), queryFn: () => notifications.countUnread(), enabled });
}

/**
 * Bildirimleri okundu işaretler ve liste + rozet önbelleğini yeniler (başarıda da hatada da: durum her zaman servisle eşitlenir).
 * İyimser güncelleme yoktur: sayaç ile liste ayrışmaz. Hata kullanıcıya gösterilmez; okunmamış kalan satır tekrar dokunulabilir.
 */
export function useMarkNotificationsRead() {
  const { notifications } = useServices();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => notifications.markRead(ids.map(asNotificationId)),
    onSettled: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) }), queryClient.invalidateQueries({ queryKey: notificationKeys.unread(userId) })]),
  });
}

/**
 * "Tümünü oku": hesaba ait TÜM okunmamışları (yalnız yüklü sayfaları değil) mevcut sözleşmeyle işaretler — `list` ile bütün sayfaları
 * toplar (bitiş imleci görülmeden bitmez), sonra tek `markRead` çağrısı yapar (atomik). Yeni servis metodu yoktur.
 *  - Tekrar tıklama: `isPending` boyunca düğme devre dışıdır (çift işlem yok).
 *  - Hata (toplama, sınır/imleç tekrarı ya da işaretleme) kalıcı olarak `isError`/`error` durumundadır; `mutate` yeniden denemedir ve baştan toplar (kısmi yazma yok).
 *  - Oturum izolasyonu: işlem başladığındaki oturum nesli (çıkış ve kullanıcı değişimiyle artar) her adımdan sonra doğrulanır; oturum değişmişse (çıkış, başka hesap)
 *    ne yeni hesabın listesi toplanır ne de eski kimlikler yazılır — `unauthenticated` ile durur. Servis de aynı korumayı ayrıca uygular.
 * Sonuç, işaretlenen bildirim sayısıdır.
 */
export function useMarkAllNotificationsRead() {
  const { notifications } = useServices();
  const { session, beginOperation } = useSession();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      const startedUserId = userId;
      const sessionUnchanged = beginOperation();
      // `sessionUnchanged`: çıkış YA DA kullanıcı değişimi (A → B) sayacı eşzamanlı artırır (SessionProvider.setSession).
      const live = () => sessionUnchanged() && startedUserId !== null;
      if (!live() || session?.user.emailVerified !== true) throw appError.unauthenticated();

      // Tamlık görülemezse (100 sayfa sınırında imleç dolu / imleç tekrarı) `collectUnreadIds` fırlatır: hiçbir `markRead` yapılmaz.
      const unread = await collectUnreadIds((cursor) => notifications.list({ cursor }), () => {
        if (!live()) throw appError.unauthenticated();
      });
      if (unread.length === 0) return 0;
      if (!live()) throw appError.unauthenticated();
      await notifications.markRead(unread.map(asNotificationId));
      return unread.length;
    },
    onSettled: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) }), queryClient.invalidateQueries({ queryKey: notificationKeys.unread(userId) })]),
  });
}
