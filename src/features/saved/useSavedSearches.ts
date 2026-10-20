import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { appError, asSavedSearchId, savedSearchTitle, searchKey, userMessage, type ListingSearch, type SavedSearch } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

import { collectAllPages } from './collectPages';

function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const savedSearchesKeys = {
  all: (userId: string | null) => ['saved-searches', userId] as const,
  list: (userId: string | null) => [...savedSearchesKeys.all(userId), 'list'] as const,
  change: ['saved-searches', 'change'] as const,
};

type SavedList = readonly SavedSearch[];

/** Hesabın TÜM kayıtlı aramaları (en yeni önce); profil sayacı, liste ekranı ve sonuç ekranındaki "kayıtlı" durumu bu tek listeden türer. */
export function useSavedSearchesQuery() {
  const { savedSearches } = useServices();
  const { beginOperation } = useSession();
  const { enabled, userId } = useQueryScope();
  return useQuery({
    queryKey: savedSearchesKeys.list(userId),
    queryFn: () => {
      const unchanged = beginOperation();
      return collectAllPages(
        (cursor) => savedSearches.list({ cursor }),
        (saved) => saved.id,
        () => {
          if (!unchanged()) throw appError.unauthenticated();
        },
      );
    },
    enabled,
  });
}

/**
 * `isCurrent`: eylem ANINDA `SessionProvider.beginOperation()` ile yakalanan oturum kanıtı (çıkış ya da A → B sonrası `false`). `mutationFn` servis
 * çağrısından hemen önce denetler: TanStack yürütmesindeki `await` sınırında oturum değişmişse eski kullanıcının eylemi yeni kullanıcı adına servise GİTMEZ
 * (servis guard'ı yalnızca çağrı başladıktan sonraki değişimi yakalar).
 */
type ChangeVariables =
  | { readonly userId: string; readonly kind: 'create'; readonly title: string; readonly search: ListingSearch; readonly isCurrent: () => boolean }
  | { readonly userId: string; readonly kind: 'remove'; readonly id: string; readonly isCurrent: () => boolean };

/**
 * Kayıtlı arama oluştur/sil. İYİMSER DEĞİL (oluşturmada kimlik/zaman servisten gelir): işlem sürerken `busy`, başarıda liste önbelleği güncellenir
 * ve servisle eşitlenir; hata görünür kalır ve liste değişmez. Sonuç yalnızca başlatan kullanıcının önbelleğine yazılır.
 */
function useSavedSearchChange() {
  const { savedSearches } = useServices();
  const queryClient = useQueryClient();
  return useMutation<SavedSearch | null, unknown, ChangeVariables>({
    mutationKey: savedSearchesKeys.change,
    mutationFn: async (variables) => {
      if (!variables.isCurrent()) throw appError.unauthenticated(); // servis çağrısından ÖNCE, arada `await` olmadan
      if (variables.kind === 'create') return savedSearches.create({ title: variables.title, search: variables.search });
      await savedSearches.remove(asSavedSearchId(variables.id));
      return null;
    },
    onSuccess: (created, variables) => {
      const key = savedSearchesKeys.list(variables.userId);
      const current = queryClient.getQueryData<SavedList>(key);
      if (!current) return;
      if (variables.kind === 'remove') {
        queryClient.setQueryData<SavedList>(key, current.filter((saved) => saved.id !== variables.id));
      } else if (created && !current.some((saved) => saved.id === created.id)) {
        queryClient.setQueryData<SavedList>(key, [created, ...current]);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (queryClient.isMutating({ mutationKey: savedSearchesKeys.change }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: savedSearchesKeys.list(variables.userId) });
    },
  });
}

/**
 * Sonuç ekranındaki "Aramayı kaydet" (zil) durumu ve eylemi: bu arama (metin + filtre kümesi + sıra) kayıtlıysa `saved` doludur ve eylem kaydı
 * KALDIRIR; değilse kaydeder (ad: çip etiketlerinden, bkz. `savedSearchTitle`). Liste yüklenmeden durum bilinmez: eylem yeniden yüklemeyi dener.
 * Çift dokunuş: işlem sürerken yok sayılır (servis ayrıca aynı aramayı mükerrer kaydetmez).
 */
export function useSavedSearchToggle(search: ListingSearch) {
  const { userId } = useQueryScope();
  const { beginOperation } = useSession();
  const query = useSavedSearchesQuery();
  const change = useSavedSearchChange();
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false); // aynı tıkta (render beklemeden) gelen ikinci dokunuşu da engeller
  const key = useMemo(() => searchKey(search), [search]);
  const saved = useMemo(() => (query.data ?? []).find((candidate) => searchKey(candidate.search) === key) ?? null, [query.data, key]);
  const { mutate } = change;
  const { refetch } = query;
  const ready = query.data !== undefined;
  const busy = change.isPending;

  const toggle = useCallback(() => {
    if (userId === null || busy || inFlight.current) return;
    if (!ready) {
      void refetch();
      return;
    }
    setNotice(null);
    inFlight.current = true;
    const isCurrent = beginOperation();
    const done = () => {
      inFlight.current = false;
    };
    // Oturum değiştiyse eski eylemin bildirimi/hatası yeni oturumun ekranında gösterilmez.
    const notify = (message: string) => {
      if (isCurrent()) setNotice(message);
    };
    if (saved) {
      mutate(
        { userId, kind: 'remove', id: saved.id, isCurrent },
        {
          onSuccess: () => notify('Kayıtlı aramalarınızdan çıkarıldı.'),
          onError: (error) => notify(`Arama kayıtlı aramalardan çıkarılamadı. ${userMessage(error)}`),
          onSettled: done,
        },
      );
      return;
    }
    mutate(
      { userId, kind: 'create', title: savedSearchTitle(search), search, isCurrent },
      {
        onSuccess: () => notify('Arama kaydedildi. Profil › Kayıtlı Aramalarım bölümünden aynı filtre ve sıralamayla açabilirsiniz.'),
        onError: (error) => notify(`Arama kaydedilemedi. ${userMessage(error)}`),
        onSettled: done,
      },
    );
  }, [beginOperation, busy, mutate, ready, refetch, saved, search, userId]);

  return { saved, ready, busy, toggle, notice, dismissNotice: () => setNotice(null) };
}

/** Kayıtlı aramalar ekranındaki silme: hangi kayıt işleniyor (`removingId`) ve görünür hata. Başarıda satır listeden kalkar. */
export function useRemoveSavedSearch() {
  const { userId } = useQueryScope();
  const { beginOperation } = useSession();
  const change = useSavedSearchChange();
  const [failure, setFailure] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { mutate } = change;

  const remove = useCallback(
    (id: string) => {
      if (userId === null || removingId !== null) return;
      setFailure(null);
      setRemovingId(id);
      const isCurrent = beginOperation();
      mutate(
        { userId, kind: 'remove', id, isCurrent },
        {
          onError: (error) => {
            if (isCurrent()) setFailure(`Kayıtlı arama silinemedi. ${userMessage(error)}`); // eski oturumun hatası yeni oturumda gösterilmez
          },
          onSettled: () => setRemovingId(null),
        },
      );
    },
    [beginOperation, mutate, removingId, userId],
  );

  return { remove, removingId, failure, dismissFailure: () => setFailure(null) };
}
