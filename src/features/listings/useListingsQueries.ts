import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { asListingId, EMPTY_FILTERS, EMPTY_SEARCH, encodeSearchParam, type CategoryId, type ListingSearch, type ListingSummary, type Page } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';

/**
 * Sorgu kapsamı: oturumlu ekranların sorguları yalnızca oturum hazır VE e-posta doğrulanmışken çalışır ve anahtara kullanıcı kimliği girer.
 * Çıkışta `enabled` kapanır (yeniden çekme yok) ve başka kullanıcının girişinde önceki kullanıcının önbelleği paylaşılmaz.
 * Çıkış ayrıca `queryClient.clear()` ile tüm önbelleği boşaltır (`useSignOut`).
 */
function useQueryScope() {
  const { session } = useSession();
  return { enabled: session?.user.emailVerified === true, userId: session?.user.id ?? null };
}

export const listingsKeys = {
  all: (userId: string | null) => ['listings', userId] as const,
  categories: (userId: string | null) => [...listingsKeys.all(userId), 'categories'] as const,
  featured: (userId: string | null) => [...listingsKeys.all(userId), 'featured'] as const,
  count: (userId: string | null, search: ListingSearch) => [...listingsKeys.all(userId), 'count', encodeSearchParam(search)] as const,
  brands: (userId: string | null, categories: readonly CategoryId[]) => [...listingsKeys.all(userId), 'brands', [...categories].sort().join(',')] as const,
  search: (userId: string | null, search: ListingSearch) => [...listingsKeys.all(userId), 'search', encodeSearchParam(search)] as const,
  detail: (userId: string | null, listingId: string) => [...listingsKeys.all(userId), 'detail', listingId] as const,
  feed: (userId: string | null, categoryId: CategoryId | null) => [...listingsKeys.all(userId), 'feed', categoryId ?? 'all'] as const,
};

export function useCategoriesQuery() {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: listingsKeys.categories(userId), queryFn: () => listings.listCategories(), enabled });
}

/** Ana sayfa "Öne Çıkan İlanlar" karuseli. */
export function useFeaturedQuery() {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: listingsKeys.featured(userId), queryFn: () => listings.listFeatured(), enabled });
}

/** Aramayla eşleşen ilan sayısı ("75 ilan", "94 ilanı göster"). `search` null ise sorgu çalışmaz (ör. form geçersizken). */
export function useListingCountQuery(search: ListingSearch | null) {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({
    queryKey: listingsKeys.count(userId, search ?? EMPTY_SEARCH),
    queryFn: () => listings.countListings(search ?? EMPTY_SEARCH),
    enabled: enabled && search !== null,
    placeholderData: (previous) => previous,
  });
}

/** Filtre marka önerileri: seçili kategorilerdeki ilanların markaları (boş seçim = tüm ilanlar). */
export function useBrandsQuery(categories: readonly CategoryId[]) {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({ queryKey: listingsKeys.brands(userId, categories), queryFn: () => listings.listBrands(categories), enabled, staleTime: 5 * 60_000 });
}

/** En yeni ilanlar (seçili kategori ya da hepsi), 20'şerli sayfalarla. `categoryId` filtre rotasının taşıdığı değerle aynı sözleşmedir. */
export function useListingFeedQuery(categoryId: CategoryId | null) {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useInfiniteQuery({
    queryKey: listingsKeys.feed(userId, categoryId),
    queryFn: ({ pageParam }) =>
      listings.searchListings({
        search: { ...EMPTY_SEARCH, filters: { ...EMPTY_FILTERS, categories: categoryId ? [categoryId] : [] } },
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/**
 * Arama sonuçları (06): anahtar kullanıcı + normalize aramanın tamamıdır. Arama (metin, filtre, sıra) değişince anahtar değişir; yeni anahtar
 * boş başlar (önceki aramanın sayfaları taşınmaz) ve eski anahtarın geç gelen yanıtı yalnızca kendi önbelleğine yazılır.
 */
export function useSearchResultsQuery(search: ListingSearch) {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useInfiniteQuery({
    queryKey: listingsKeys.search(userId, search),
    queryFn: ({ pageParam }) => listings.searchListings({ search, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/** Sayfaları birleştirir; tekrar eden kimlikler (sayfa sınırında kayan veri) ilk görüldüğü yerde kalır. */
export function flattenUniquePages(pages: readonly Page<ListingSummary>[] | undefined): readonly ListingSummary[] {
  const seen = new Set<string>();
  const items: ListingSummary[] = [];
  for (const page of pages ?? []) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/**
 * İlan detayı (07): anahtar kullanıcı + `listingId`. ID değişince yeni anahtar boş başlar (önceki ilanın verisi gösterilmez) ve eski ID'nin
 * geç yanıtı yalnızca kendi önbelleğine yazılır. Boş ID sorgu başlatmaz (ekran bunu `notFound` sayar).
 */
export function useListingQuery(listingId: string) {
  const { listings } = useServices();
  const { enabled, userId } = useQueryScope();
  return useQuery({
    queryKey: listingsKeys.detail(userId, listingId),
    queryFn: () => listings.getListing(asListingId(listingId)),
    enabled: enabled && listingId.length > 0,
  });
}
