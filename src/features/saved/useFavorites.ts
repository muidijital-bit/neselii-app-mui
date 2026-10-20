import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { appError, asListingId, userMessage, type FavoriteEntry, type ListingSummary } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

import { collectAllPages } from './collectPages';

/** Sorgu kapsamı (listings/messaging/notifications ile aynı kural): oturum hazır VE e-posta doğrulanmışken çalışır; anahtara kullanıcı kimliği girer. */
function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const favoritesKeys = {
  all: (userId: string | null) => ['favorites', userId] as const,
  list: (userId: string | null) => [...favoritesKeys.all(userId), 'list'] as const,
  toggle: ['favorites', 'toggle'] as const,
};

type FavoriteList = readonly FavoriteEntry[];

/**
 * Hesabın TÜM favorileri (en yeni önce): kart kalbi, ilan detayı kalbi, favoriler listesi ve profil sayacı bu TEK listeden türer, böylece
 * yüzeyler ayrışmaz. Mevcut `list` sözleşmesinin tüm sayfaları toplanır (bitiş imleci görülmedikçe başarı sayılmaz; kısmi sayaç gösterilmez).
 * Sayfa aralarında oturum değişirse (çıkış, A → B) toplama `unauthenticated` ile durur ve eski kullanıcının listesine yeni kullanıcının sayfası yazılmaz.
 */
export function useFavoritesQuery() {
  const { favorites } = useServices();
  const { beginOperation } = useSession();
  const { enabled, userId } = useQueryScope();
  return useQuery({
    queryKey: favoritesKeys.list(userId),
    queryFn: () => {
      const unchanged = beginOperation();
      return collectAllPages(
        (cursor) => favorites.list({ cursor }),
        (entry) => entry.listingId,
        () => {
          if (!unchanged()) throw appError.unauthenticated();
        },
      );
    },
    enabled,
  });
}

type ToggleVariables = {
  /** Mutasyonu başlatan kullanıcı: geç gelen sonuç/geri alma yalnızca KENDİ önbelleğine yazılır. */
  readonly userId: string;
  readonly listingId: string;
  readonly next: boolean;
  readonly summary: ListingSummary | null;
  readonly addedAt: string;
  /**
   * Eylem ANINDA `SessionProvider.beginOperation()` ile yakalanan oturum kanıtı: çıkış ya da kullanıcı değişimi (A → B) sonrası `false`.
   * `mutationFn` servis çağrısından hemen önce bunu denetler; `onMutate` içindeki `await` (ve TanStack'in yürütme sınırı) sırasında oturum
   * değişmişse eski kullanıcının eylemi yeni kullanıcı adına servise GİTMEZ. Servis guard'ı yalnızca çağrı başladıktan sonraki değişimi yakalar.
   */
  readonly isCurrent: () => boolean;
};

type ToggleContext = {
  readonly inserted: boolean;
  readonly removed: { readonly entry: FavoriteEntry; readonly index: number } | null;
};

/**
 * Favori aç/kapa (kart ve ilan detayı ortak): İYİMSER güncelleme + geri alma.
 *  - Kalp hemen döner (tek liste güncellenir → kart, detay, liste ve profil sayacı birlikte değişir); servis hata verirse yalnızca bu ilanın
 *    değişikliği geri alınır (başka ilanın eşzamanlı değişikliği ezilmez) ve görünür `failure` ayarlanır.
 *  - Aynı ilan için işlem sürerken yeni dokunuş yok sayılır (çift dokunuş tek istek; servis zaten idempotenttir → mükerrer favori oluşmaz).
 *  - Liste henüz yüklenmediyse/yüklenemediyse durum bilinmez: dokunuş yeniden yüklemeyi dener (tahminle ekleme/kaldırma yapılmaz).
 *  - Başarı ya da hata sonrası (başka toggle sürmüyorsa) liste servisle eşitlenir.
 */
export function useFavoriteToggle() {
  const { favorites } = useServices();
  const { userId } = useQueryScope();
  const queryClient = useQueryClient();
  const query = useFavoritesQuery();
  const [failure, setFailure] = useState<string | null>(null);
  // Aynı tıkta (render beklemeden) gelen ikinci dokunuşu da engeller; temizlik mutasyon düzeyindedir (`mutate` çağrı düzeyi geri çağırmaları
  // aynı gözlemcide sonraki `mutate` çağrısıyla düşer, eşzamanlı farklı ilan işlemleri için güvenilir değildir).
  const inFlight = useRef(new Set<string>());

  const mutation = useMutation<void, unknown, ToggleVariables, ToggleContext>({
    mutationKey: favoritesKeys.toggle,
    mutationFn: ({ listingId, next, isCurrent }) => {
      // Servis çağrısından ÖNCE, arada `await` olmadan: bayat eylem hiçbir şey yazmaz.
      if (!isCurrent()) return Promise.reject(appError.unauthenticated());
      return next ? favorites.add(asListingId(listingId)).then(() => undefined) : favorites.remove(asListingId(listingId));
    },
    onMutate: async ({ userId: owner, listingId, next, summary, addedAt, isCurrent }) => {
      const key = favoritesKeys.list(owner);
      await queryClient.cancelQueries({ queryKey: key });
      if (!isCurrent()) return { inserted: false, removed: null }; // oturum değişti: iyimser güncelleme yok
      const current = queryClient.getQueryData<FavoriteList>(key);
      if (!current) return { inserted: false, removed: null };
      if (next) {
        if (current.some((entry) => entry.listingId === listingId)) return { inserted: false, removed: null };
        queryClient.setQueryData<FavoriteList>(key, [{ listingId: asListingId(listingId), addedAt, listing: summary }, ...current]);
        return { inserted: true, removed: null };
      }
      const index = current.findIndex((entry) => entry.listingId === listingId);
      if (index === -1) return { inserted: false, removed: null };
      queryClient.setQueryData<FavoriteList>(key, current.filter((entry) => entry.listingId !== listingId));
      return { inserted: false, removed: { entry: current[index], index } };
    },
    onError: (error, { userId: owner, listingId, isCurrent }, context) => {
      // Başka oturumun ekranına eski hesabın hatası yazılmaz (eski kullanıcının önbelleği aşağıda yine geri alınır).
      if (isCurrent()) setFailure(`Favori güncellenemedi. ${userMessage(error)}`);
      const key = favoritesKeys.list(owner);
      const current = queryClient.getQueryData<FavoriteList>(key);
      if (!current || !context) return;
      if (context.inserted) {
        queryClient.setQueryData<FavoriteList>(key, current.filter((entry) => entry.listingId !== listingId));
      } else if (context.removed && !current.some((entry) => entry.listingId === listingId)) {
        const next = [...current];
        next.splice(Math.min(context.removed.index, next.length), 0, context.removed.entry);
        queryClient.setQueryData<FavoriteList>(key, next);
      }
    },
    onSettled: (_data, _error, { userId: owner, listingId }) => {
      inFlight.current.delete(listingId);
      if (queryClient.isMutating({ mutationKey: favoritesKeys.toggle }) > 1) return; // son işlem eşitler: eşzamanlı iyimser değişiklik geri sıçramasın
      return queryClient.invalidateQueries({ queryKey: favoritesKeys.list(owner) });
    },
  });

  const pendingIds = useMutationState({
    filters: { mutationKey: favoritesKeys.toggle, status: 'pending' },
    select: (item) => (item.state.variables as ToggleVariables | undefined)?.listingId,
  });

  const ids = useMemo(() => new Set((query.data ?? []).map((entry) => entry.listingId as string)), [query.data]);
  const pending = useMemo(() => new Set(pendingIds.filter((id): id is string => id !== undefined)), [pendingIds]);
  const { mutate } = mutation;
  const { refetch } = query;
  const { beginOperation } = useSession();
  const ready = query.data !== undefined;

  const toggle = useCallback(
    (listingId: string, summary: ListingSummary | null = null) => {
      if (userId === null) return;
      if (!ready) {
        void refetch();
        return;
      }
      if (pending.has(listingId) || inFlight.current.has(listingId)) return;
      inFlight.current.add(listingId);
      setFailure(null);
      mutate({ userId, listingId, next: !ids.has(listingId), summary, addedAt: new Date().toISOString(), isCurrent: beginOperation() });
    },
    [beginOperation, ids, mutate, pending, ready, refetch, userId],
  );

  return {
    /** Favori listesi yüklendi mi (kalp durumu ve sayaç ancak o zaman kesindir). */
    ready,
    /** Yüklenen favori sayısı (ilanı kaldırılmış kayıtlar dahil: liste ekranındaki satır sayısıyla aynı); yüklenmediyse `null`. */
    count: query.data?.length ?? null,
    isFavorite: (listingId: string) => ids.has(listingId),
    isPending: (listingId: string) => pending.has(listingId),
    /** `summary`: iyimser eklemede listede görünecek ilan özeti (yoksa yenilemeye kadar `listing: null`); kaldırmada gerekmez. */
    toggle,
    failure,
    dismissFailure: () => setFailure(null),
  };
}
