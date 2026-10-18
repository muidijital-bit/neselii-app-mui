import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { SearchState } from '@/features/listings/search-store';
import { supabase } from '@/lib/supabase';
import type { CategoryStatsRow, ListingMediaRow, ListingRow } from '@/types/database';

const PAGE_SIZE = 20;
const VISIBLE_STATUSES = ['published', 'reserved'] as const;
/** Bu sütunlar listings tablosunda; diğer kategori alanları attributes (jsonb) içinde. */
const COLUMN_FIELDS = new Set(['km', 'year']);

export type ListingSummary = Pick<
  ListingRow,
  | 'id'
  | 'listing_no'
  | 'category_slug'
  | 'subtype'
  | 'title'
  | 'price'
  | 'currency'
  | 'city'
  | 'district'
  | 'year'
  | 'km'
  | 'attributes'
  | 'status'
  | 'cover_url'
  | 'photo_count'
  | 'has_video'
  | 'published_at'
>;

export const LISTING_SUMMARY_COLUMNS =
  'id, listing_no, category_slug, subtype, title, price, currency, city, district, year, km, attributes, status, cover_url, photo_count, has_video, published_at';

export type ListingPage = { items: ListingSummary[]; count: number | null };

export type ListingDetail = ListingRow & { media: ListingMediaRow[] };

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CategoryStatsRow[]> => {
      const { data, error } = await supabase.from('category_stats').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCategoryMap() {
  const categories = useCategories();
  return new Map((categories.data ?? []).map((c) => [c.slug, c]));
}

// Supabase sorgu oluşturucusunun burada kullanılan kısmı (liste ve sayaç sorguları ortak)
type Filterable<T> = {
  eq(column: string, value: unknown): T;
  gte(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
  ilike(column: string, pattern: string): T;
  or(filters: string): T;
  not(column: string, operator: string, value: unknown): T;
};

/** Arama metni ve filtreleri sorguya uygular. */
function applySearch<T extends Filterable<T>>(q: T, query: string, filters: SearchState['filters']): T {
  const text = query.trim();
  if (text) {
    // İlan numarasıyla tam eşleşme ya da başlık/marka/model içinde arama
    const escaped = text.replace(/[%_,()]/g, ' ');
    q = /^\d+$/.test(text)
      ? q.or(`listing_no.eq.${text},search_text.ilike.%${escaped}%`)
      : q.ilike('search_text', `%${escaped}%`);
  }
  if (filters.category) q = q.eq('category_slug', filters.category);
  if (filters.subtype) q = q.eq('subtype', filters.subtype);
  if (filters.brand) q = q.eq('brand', filters.brand);
  if (filters.minYear != null) q = q.gte('year', filters.minYear);
  if (filters.maxYear != null) q = q.lte('year', filters.maxYear);
  if (filters.minPrice != null) q = q.gte('price', filters.minPrice);
  if (filters.maxPrice != null) q = q.lte('price', filters.maxPrice);
  if (filters.financing) q = q.not('attributes->>financing', 'is', null);
  for (const [key, value] of Object.entries(filters.fields ?? {})) {
    const column = COLUMN_FIELDS.has(key) ? key : `attributes->${key}`;
    if (typeof value === 'string') {
      q = q.eq(COLUMN_FIELDS.has(key) ? key : `attributes->>${key}`, value);
    } else {
      if (value.min != null) q = q.gte(column, value.min);
      if (value.max != null) q = q.lte(column, value.max);
    }
  }
  return q;
}

/** Ana sayfa vitrini: öne çıkan ilanlar; yoksa fotoğraflı en yeni ilanlar */
export function useFeaturedListings() {
  return useQuery({
    queryKey: ['featured-listings'],
    queryFn: async (): Promise<ListingSummary[]> => {
      const base = () =>
        supabase
          .from('listings')
          .select(LISTING_SUMMARY_COLUMNS)
          .in('status', VISIBLE_STATUSES)
          .not('cover_url', 'is', null)
          .order('published_at', { ascending: false })
          .limit(8);
      const featured = await base().eq('is_featured', true);
      if (!featured.error && featured.data.length) return featured.data as ListingSummary[];
      const latest = await base();
      if (latest.error) throw latest.error;
      return latest.data as ListingSummary[];
    },
  });
}

/** Filtre ekranındaki "N ilanı göster" sayısı */
export function useListingCount({ query, filters }: Pick<SearchState, 'query' | 'filters'>) {
  return useQuery({
    queryKey: ['listing-count', query, filters],
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const base = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .in('status', VISIBLE_STATUSES);
      const { count, error } = await applySearch(base, query, filters);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useListings({ query, filters, sort }: SearchState) {
  return useInfiniteQuery({
    queryKey: ['listings', query, filters, sort],
    initialPageParam: 0,
    getNextPageParam: (lastPage: ListingPage, _all: ListingPage[], lastPageParam: number) =>
      lastPage.items.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    queryFn: async ({ pageParam }): Promise<ListingPage> => {
      let q = supabase
        .from('listings')
        .select(LISTING_SUMMARY_COLUMNS, { count: pageParam === 0 ? 'exact' : undefined })
        .in('status', VISIBLE_STATUSES);

      q = applySearch(q, query, filters);

      switch (sort) {
        case 'price_asc':
          q = q.order('price', { ascending: true });
          break;
        case 'price_desc':
          q = q.order('price', { ascending: false });
          break;
        case 'year_desc':
          q = q.order('year', { ascending: false, nullsFirst: false });
          break;
        case 'km_asc':
          q = q.order('km', { ascending: true, nullsFirst: false });
          break;
        default:
          q = q.order('published_at', { ascending: false });
      }

      const from = pageParam * PAGE_SIZE;
      const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { items: data as ListingSummary[], count };
    },
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: !!id,
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, media:listing_media(*)')
        .eq('id', id!)
        .order('sort_order', { referencedTable: 'listing_media' })
        .single();
      if (error) throw error;
      return data as ListingDetail;
    },
  });
}

/** Filtre ekranındaki marka listesi (yayındaki ilanlardan) */
export function useBrands(category?: string) {
  return useQuery({
    queryKey: ['brands', category ?? 'all'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let q = supabase.from('listings').select('brand').in('status', VISIBLE_STATUSES).not('brand', 'is', null);
      if (category) q = q.eq('category_slug', category);
      const { data, error } = await q;
      if (error) throw error;
      return [...new Set(data.map((r) => r.brand as string))].sort((a, b) => a.localeCompare(b, 'tr'));
    },
  });
}
