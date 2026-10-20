import {
  EMPTY_FILTERS,
  appError,
  asSavedSearchId,
  decodeSearchParam,
  savedSearchTitleError,
  searchKey,
  type ListingSearch,
  type ListingSort,
  type PageInput,
  type SavedSearch,
  type SavedSearchId,
} from '@/domain';

import type { CreateSavedSearchInput, SavedSearchesService } from '../contracts';
import type { Supabase } from './client';
import type { Json, Tables } from './database.types';
import { call, offsetOf, pageRange, requireUserId, toIso, toPage, unwrap , ensure } from './shared';

type Row = Pick<Tables<'saved_searches'>, 'id' | 'name' | 'query' | 'filters' | 'sort' | 'created_at'>;

const SORTS: readonly ListingSort[] = ['newest', 'price-asc', 'price-desc'];

/**
 * Sunucudaki "yeni ilan" bildirim tetikleyicisi (`private.notify_listing_changes`) kayıtlı aramayı bu DÜZ anahtarlarla eşler:
 * `category`, `brand`, `minPrice`/`maxPrice` (TL), `minYear`/`maxYear`. Uygulamanın `ListingFilters` biçimiyle birlikte yazılır,
 * okurken çıkarılır.
 */
const TRIGGER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'minYear', 'maxYear'] as const;

function withTriggerKeys(search: ListingSearch): Json {
  const { filters } = search;
  const legacy: Record<string, string | number> = {};
  if (filters.categories.length === 1) legacy.category = filters.categories[0];
  if (filters.specific.kind !== 'estate') {
    if (filters.specific.brand) legacy.brand = filters.specific.brand;
    if (filters.specific.modelYear?.min !== undefined) legacy.minYear = filters.specific.modelYear.min;
    if (filters.specific.modelYear?.max !== undefined) legacy.maxYear = filters.specific.modelYear.max;
  }
  if (filters.price?.min !== undefined) legacy.minPrice = filters.price.min / 100;
  if (filters.price?.max !== undefined) legacy.maxPrice = filters.price.max / 100;
  return { ...(filters as unknown as Record<string, Json>), ...legacy };
}

function withoutTriggerKeys(filters: Json): Json {
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return filters;
  const copy: Record<string, Json | undefined> = { ...filters };
  for (const key of TRIGGER_KEYS) delete copy[key];
  return copy as Json;
}

/**
 * Satırdaki metin + filtre + sıra → `ListingSearch`. Form kurallarından (`decodeSearchParam`) geçemeyen eski/bozuk filtre JSON'u
 * yok sayılır; metin ve sıra korunur (arama yine açılır).
 */
function toSearch(row: Row): ListingSearch {
  const sort = SORTS.includes(row.sort as ListingSort) ? (row.sort as ListingSort) : 'newest';
  const query = row.query?.trim() ?? '';
  return decodeSearchParam(JSON.stringify({ query, filters: withoutTriggerKeys(row.filters), sort })) ?? { query, filters: EMPTY_FILTERS, sort };
}

const toSaved = (row: Row): SavedSearch => ({ id: asSavedSearchId(row.id), title: row.name, search: toSearch(row), createdAt: toIso(row.created_at) });

const COLUMNS = 'id, name, query, filters, sort, created_at';

/** Kayıtlı aramalar: en son kaydedilen önce. Aynı arama (`searchKey`) ikinci kez kaydedilmez; mevcut kayıt döner. */
export function createSupabaseSavedSearches(sb: Supabase): SavedSearchesService {
  return {
    list: (input?: PageInput) =>
      call(async () => {
        const userId = await requireUserId(sb);
        const offset = offsetOf(input?.cursor);
        const [from, to] = pageRange(offset);
        const rows = unwrap(
          await sb.from('saved_searches').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(from, to),
        );
        return toPage(rows, offset, toSaved);
      }),

    create: ({ title, search }: CreateSavedSearchInput) =>
      call(async () => {
        const message = savedSearchTitleError(title);
        if (message) throw appError.validation({ title: message });
        const userId = await requireUserId(sb);

        const key = searchKey(search);
        const existing = unwrap(await sb.from('saved_searches').select(COLUMNS).eq('user_id', userId)).map(toSaved);
        const duplicate = existing.find((saved) => searchKey(saved.search) === key);
        if (duplicate) return duplicate;

        const row = unwrap(
          await sb
            .from('saved_searches')
            .insert({ user_id: userId, name: title.trim(), query: search.query || null, filters: withTriggerKeys(search), sort: search.sort, notify: true })
            .select(COLUMNS)
            .single(),
        );
        return toSaved(row);
      }),

    remove: (id: SavedSearchId) =>
      call(async () => {
        const userId = await requireUserId(sb);
        ensure(await sb.from('saved_searches').delete().eq('user_id', userId).eq('id', id));
      }),
  };
}
