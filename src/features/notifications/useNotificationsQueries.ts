import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { appError, asNotificationId, type AppNotification, type Page } from '@/domain';
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
  /** Bildirim silme mutasyonları (eşzamanlı silmelerde yalnız sonuncusu listeyi sunucuyla eşitler). */
  remove: ['notifications', 'remove'] as const,
};

type NotificationsData = InfiniteData<Page<AppNotification>, string | undefined>;

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

type RemoveVariables = {
  readonly ids: readonly string[];
  /** Mutasyonu başlatan kullanıcı: geri alma/eşitleme yalnızca KENDİ önbelleğine yazılır. */
  readonly userId: string;
  /** Eylem anındaki oturum kanıtı (`beginOperation`): çıkış/kullanıcı değişiminden sonra servis çağrılmaz. */
  readonly isCurrent: () => boolean;
};

type RemovedNotification = { readonly notification: AppNotification; readonly page: number; readonly index: number };
type RemoveContext = { readonly removed: readonly RemovedNotification[] };

function findNotifications(data: NotificationsData | undefined, ids: ReadonlySet<string>): RemovedNotification[] {
  return (data?.pages ?? []).flatMap((page, pageIndex) =>
    page.items.flatMap((notification, index) => (ids.has(notification.id) ? [{ notification, page: pageIndex, index }] : [])),
  );
}

/**
 * Bildirimleri kalıcı olarak siler. İYİMSER: satırlar hemen kaybolur ve okunmamış sayacı silinen okunmamışlar kadar düşer; servis hata
 * verirse yalnız bu satırlar eski yerlerine döner ve sayaç geri eklenir (eşzamanlı başka silme ezilmez). Hata (geri almadan sonra) `onError` ile ekrana iletilir.
 * Son işlem bitince liste ve sayaç sunucuyla eşitlenir.
 */
export function useRemoveNotifications({ onError }: { readonly onError?: (error: unknown) => void } = {}) {
  // `mutate` düzeyi geri çağırmalar ardışık çağrılarda yalnız sonuncu için çalışır; hata bildirimi mutasyon düzeyinden en güncel geri çağırmaya gider.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const { notifications } = useServices();
  const { beginOperation } = useSession();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();

  const mutation = useMutation<void, unknown, RemoveVariables, RemoveContext>({
    mutationKey: notificationKeys.remove,
    mutationFn: ({ ids, isCurrent }) => {
      if (!isCurrent()) return Promise.reject(appError.unauthenticated());
      return notifications.remove(ids.map(asNotificationId));
    },
    onMutate: async ({ ids, userId: owner }) => {
      const key = notificationKeys.list(owner);
      await queryClient.cancelQueries({ queryKey: key });
      const current = queryClient.getQueryData<NotificationsData>(key);
      const idSet = new Set(ids);
      const removed = findNotifications(current, idSet);
      if (!current || removed.length === 0) return { removed: [] };
      queryClient.setQueryData<NotificationsData>(key, {
        ...current,
        pages: current.pages.map((page) => ({ ...page, items: page.items.filter((item) => !idSet.has(item.id)) })),
      });
      const unread = removed.filter((entry) => !entry.notification.read).length;
      if (unread > 0) queryClient.setQueryData<number>(notificationKeys.unread(owner), (count) => (count === undefined ? count : Math.max(0, count - unread)));
      return { removed };
    },
    onError: (error, { userId: owner, isCurrent }, context) => {
      // Başka oturumun ekranına eski hesabın hatası yazılmaz (eski kullanıcının önbelleği aşağıda yine geri alınır).
      if (isCurrent()) onErrorRef.current?.(error);
      const removed = context?.removed ?? [];
      if (removed.length === 0) return;
      queryClient.setQueryData<NotificationsData>(notificationKeys.list(owner), (current) => {
        if (!current) return current;
        const present = new Set(current.pages.flatMap((page) => page.items.map((item) => item.id as string)));
        const pages = current.pages.map((page) => ({ ...page, items: [...page.items] }));
        // Sırayla (sayfa, konum) yerine koyulur: önce eklenenler sonrakilerin konumunu korur.
        for (const entry of removed) {
          if (present.has(entry.notification.id)) continue;
          const target = pages[Math.min(entry.page, pages.length - 1)];
          if (!target) continue;
          target.items.splice(Math.min(entry.index, target.items.length), 0, entry.notification);
        }
        return { ...current, pages };
      });
      const unread = removed.filter((entry) => !entry.notification.read).length;
      if (unread > 0) queryClient.setQueryData<number>(notificationKeys.unread(owner), (count) => (count === undefined ? count : count + unread));
    },
    onSettled: (_data, _error, { userId: owner }) => {
      // Son işlem eşitler: hızlı ardışık silmelerde iyimser kaldırılan satırlar sunucu yanıtıyla geri sıçramasın.
      if (queryClient.isMutating({ mutationKey: notificationKeys.remove }) > 1) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(owner) }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread(owner) }),
      ]);
    },
  });

  const { mutate } = mutation;
  /** Oturum yoksa hiçbir şey yapmaz. */
  const remove = useCallback(
    (ids: readonly string[]) => {
      if (!userId || ids.length === 0) return;
      mutate({ ids, userId, isCurrent: beginOperation() });
    },
    [mutate, userId, beginOperation],
  );
  return { remove, isPending: mutation.isPending };
}
