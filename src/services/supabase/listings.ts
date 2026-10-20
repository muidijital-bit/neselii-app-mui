import {
  CATEGORY_CATALOG,
  appError,
  asListingId,
  isCategoryId,
  type Category,
  type CategoryId,
  type ListingDetail,
  type ListingFilters,
  type ListingId,
  type ListingSearch,
  type Range,
} from '@/domain';

import type { ListingsService, SearchListingsInput } from '../contracts';
import type { Supabase } from './client';
import { SUMMARY_COLUMNS, subtypeVariants, toListingDetail, toListingSummary, type ListingRow, type MediaRow } from './mappers';
import { call, kurusToTl, offsetOf, pageRange, toPage, unwrap , unwrapMaybe } from './shared';

/** Aramada görünen sunucu durumları (yayından kalkmış/taslak ilan aranmaz; RLS de gizler). */
const SEARCHABLE = ['published', 'reserved', 'sold'] as const;

const validateRange = (field: string, label: string, range: Range | undefined, errors: Record<string, string>) => {
  if (range?.min !== undefined && range.max !== undefined && range.min > range.max) errors[field] = `${label}: alt sınır üst sınırı aşamaz.`;
};

function validateFilters(filters: ListingFilters): void {
  const errors: Record<string, string> = {};
  validateRange('price', 'Fiyat', filters.price, errors);
  const { specific } = filters;
  if (specific.kind === 'vehicle') {
    validateRange('modelYear', 'Model yılı', specific.modelYear, errors);
    validateRange('odometerKm', 'Kilometre', specific.odometerKm, errors);
  } else if (specific.kind === 'trailer') {
    validateRange('modelYear', 'Model yılı', specific.modelYear, errors);
  } else {
    validateRange('areaM2', 'Alan', specific.areaM2, errors);
  }
  if (Object.keys(errors).length > 0) throw appError.validation(errors);
}

/** PostgREST `or`/`ilike` sözdizimini bozabilecek karakterler aramadan çıkarılır. */
const sanitizeToken = (token: string) => token.replace(/[%_*,()\\"'.:]/g, '').trim();

/** Seçilen kategoriler ve özel filtreler için alt tür (aks düzeni) eşleşmesi: `4x2` → `subtype in (4x2, 4×2)`. */
const driveSubtypes = (configs: readonly string[]) => configs.flatMap(subtypeVariants);

// PostgREST sorgu kurucusunun tipleri seçilen sütunlara göre değişir; filtre zinciri hepsinde aynıdır.
type Builder = any;

/** Arama metni + ortak + kategoriye özel filtreleri sorguya uygular (liste, sayım ve kayıtlı arama aynı kuralları kullanır). */
function applySearch<T>(base: T, search: ListingSearch): T {
  const { filters } = search;
  let query: Builder = base;
  query = query.in('status', filters.statuses?.length ? [...filters.statuses] : [...SEARCHABLE]);
  if (filters.categories.length > 0) query = query.in('category_slug', [...filters.categories]);
  if (filters.price?.min !== undefined) query = query.gte('price', kurusToTl(filters.price.min));
  if (filters.price?.max !== undefined) query = query.lte('price', kurusToTl(filters.price.max));
  if (filters.city) query = query.ilike('city', sanitizeToken(filters.city));
  if (filters.financing) query = query.not('attributes->>financing', 'is', null);
  if (filters.subtypes?.length) query = query.in('subtype', filters.subtypes.flatMap(subtypeVariants));

  const { specific } = filters;
  if (specific.kind === 'vehicle' || specific.kind === 'trailer') {
    if (specific.brand) query = query.ilike('brand', sanitizeToken(specific.brand));
    if (specific.modelYear?.min !== undefined) query = query.gte('year', specific.modelYear.min);
    if (specific.modelYear?.max !== undefined) query = query.lte('year', specific.modelYear.max);
  }
  if (specific.kind === 'vehicle') {
    if (specific.odometerKm?.min !== undefined) query = query.gte('km', specific.odometerKm.min);
    if (specific.odometerKm?.max !== undefined) query = query.lte('km', specific.odometerKm.max);
    if (specific.driveConfigs?.length) query = query.in('subtype', driveSubtypes(specific.driveConfigs));
  } else if (specific.kind === 'trailer') {
    if (specific.axles?.length) query = query.in('attributes->>axle_count', specific.axles.map(String));
  } else {
    if (specific.areaM2?.min !== undefined) query = query.gte('attributes->area_m2', specific.areaM2.min);
    if (specific.areaM2?.max !== undefined) query = query.lte('attributes->area_m2', specific.areaM2.max);
    if (specific.rooms?.length) query = query.in('attributes->>rooms', [...specific.rooms]);
  }

  // Serbest metin: her kelime başlık/marka/model metninde geçmeli; tamamen rakam olan kelime ilan numarasıyla da eşleşir.
  for (const token of search.query.split(/\s+/).map(sanitizeToken).filter(Boolean)) {
    query = /^\d+$/.test(token) ? query.or(`search_text.ilike.%${token}%,listing_no.eq.${token}`) : query.ilike('search_text', `%${token}%`);
  }
  return query as T;
}

export function createSupabaseListings(sb: Supabase): ListingsService {
  return {
    listCategories: () =>
      call(async (): Promise<readonly Category[]> => {
        const rows = unwrap(await sb.from('category_stats').select('slug, name, subtypes, sort_order, listing_count').order('sort_order', { ascending: true }));
        return rows.flatMap((row): Category[] => {
          if (!row.slug || !isCategoryId(row.slug)) return [];
          const definition = CATEGORY_CATALOG[row.slug];
          return [
            {
              ...definition,
              name: row.name ?? definition.name,
              subcategories: row.subtypes?.length ? row.subtypes.map((value) => value.replace(/×/g, 'x')) : definition.subcategories,
              listingCount: row.listing_count ?? 0,
            },
          ];
        });
      }),

    listBrands: (categories?: readonly CategoryId[]) =>
      call(async (): Promise<readonly string[]> => {
        let query = sb.from('listings').select('brand').in('status', [...SEARCHABLE]).not('brand', 'is', null);
        if (categories && categories.length > 0) query = query.in('category_slug', [...categories]);
        const rows = unwrap(await query.limit(5000));
        const brands = new Set(rows.flatMap((row) => (row.brand?.trim() ? [row.brand.trim()] : [])));
        return Array.from(brands).sort((a, b) => a.localeCompare(b, 'tr-TR'));
      }),

    searchListings: ({ search, cursor }: SearchListingsInput) =>
      call(async () => {
        validateFilters(search.filters);
        const offset = offsetOf(cursor);
        let query = applySearch(sb.from('listings').select(SUMMARY_COLUMNS), search);
        switch (search.sort) {
          case 'price-asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price-desc':
            query = query.order('price', { ascending: false });
            break;
          default:
            query = query.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
        }
        const [from, to] = pageRange(offset);
        const rows = unwrap(await query.order('id', { ascending: true }).range(from, to)) as unknown as ListingRow[];
        const now = Date.now();
        return toPage(rows, offset, (row) => toListingSummary(row, now));
      }),

    countListings: (search: ListingSearch) =>
      call(async () => {
        validateFilters(search.filters);
        const { count, error } = await applySearch(sb.from('listings').select('id', { count: 'exact', head: true }), search);
        if (error) throw error;
        return count ?? 0;
      }),

    listFeatured: () =>
      call(async () => {
        const rows = unwrap(
          await sb
            .from('listings')
            .select(SUMMARY_COLUMNS)
            .in('status', ['published', 'reserved'])
            .eq('is_featured', true)
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('id')
            .limit(10),
        ) as unknown as ListingRow[];
        const now = Date.now();
        return rows.map((row) => toListingSummary(row, now));
      }),

    getListing: (id: ListingId) =>
      call(async (): Promise<ListingDetail> => {
        const row = unwrapMaybe(
          await sb
            .from('listings')
            .select(`${SUMMARY_COLUMNS}, description, listing_media(id, url, type, sort_order)`)
            .eq('id', id)
            .maybeSingle(),
        ) as unknown as (ListingRow & { description: string | null; listing_media: MediaRow[] }) | null;
        if (!row) throw appError.notFound(`listing ${asListingId(id)}`);
        return toListingDetail(row);
      }),
  };
}
