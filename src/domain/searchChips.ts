import { CATEGORY_CATALOG, type CategoryId } from './categories';
import type { Range } from './common';
import { buildSearch, searchToDraft, withCategories } from './filterForm';
import type { ListingSearch } from './filters';
import { formatInteger } from './format';

/**
 * Sonuç ekranı (06) çipleri: aramanın her koşul grubu tek çip. Çip silmek yalnızca temsil ettiği koşulu kaldırır; istisna kategori
 * çipidir — kategori değişince kategoriye özel alanlar da temizlenir (PRODUCT.md), bu yüzden form kurallarından (`withCategories`) geçer.
 */

export type SearchChipId =
  | { readonly kind: 'query' }
  | { readonly kind: 'category'; readonly categoryId: CategoryId }
  | { readonly kind: 'price' | 'city' | 'statuses' | 'financing' | 'subtypes' | 'brand' | 'modelYear' | 'odometerKm' | 'driveConfigs' | 'axles' | 'areaM2' | 'rooms' };

export type SearchChip = {
  readonly key: string;
  readonly id: SearchChipId;
  readonly label: string;
  /** "Filtre · N" sayacına girer (arama metni girmez). */
  readonly isFilter: boolean;
};

const STATUS_LABELS = { published: 'Yayında', reserved: 'Rezerve', sold: 'Satıldı' } as const;

type RangeWords = { readonly suffix?: string; readonly minOnly: string; readonly maxOnly: string };

function rangeLabel(range: Range, format: (value: number) => string, words: RangeWords): string | null {
  const { min, max } = range;
  const suffix = words.suffix ? ` ${words.suffix}` : '';
  if (min !== undefined && max !== undefined) return `${format(min)} – ${format(max)}${suffix}`;
  if (min !== undefined) return `${words.minOnly.replace('{}', format(min))}${suffix}`;
  if (max !== undefined) return `${words.maxOnly.replace('{}', format(max))}${suffix}`;
  return null;
}

const tl = (kurus: number) => formatInteger(Math.floor(kurus / 100));
const AT_LEAST_MOST = { minOnly: 'En az {}', maxOnly: 'En fazla {}' } as const;

export function searchChips(search: ListingSearch): readonly SearchChip[] {
  const chips: SearchChip[] = [];
  const add = (key: string, id: SearchChipId, label: string | null, isFilter = true) => {
    if (label) chips.push({ key, id, label, isFilter });
  };
  const { filters } = search;
  if (search.query) add('query', { kind: 'query' }, `“${search.query}”`, false);
  for (const categoryId of filters.categories) add(`category-${categoryId}`, { kind: 'category', categoryId }, CATEGORY_CATALOG[categoryId].name);
  if (filters.price) add('price', { kind: 'price' }, rangeLabel(filters.price, tl, { suffix: 'TL', ...AT_LEAST_MOST }));
  if (filters.city) add('city', { kind: 'city' }, filters.city);
  if (filters.statuses?.length) add('statuses', { kind: 'statuses' }, filters.statuses.map((status) => STATUS_LABELS[status]).join(', '));
  if (filters.subtypes?.length) add('subtypes', { kind: 'subtypes' }, filters.subtypes.join(', '));
  if (filters.financing) add('financing', { kind: 'financing' }, 'Taksitli / kredili');
  const { specific } = filters;
  if (specific.kind === 'estate') {
    if (specific.areaM2) add('areaM2', { kind: 'areaM2' }, rangeLabel(specific.areaM2, formatInteger, { suffix: 'm²', ...AT_LEAST_MOST }));
    if (specific.rooms?.length) add('rooms', { kind: 'rooms' }, specific.rooms.join(', '));
  } else {
    if (specific.brand) add('brand', { kind: 'brand' }, specific.brand);
    if (specific.modelYear) add('modelYear', { kind: 'modelYear' }, rangeLabel(specific.modelYear, String, { minOnly: '{}+', maxOnly: '{} ve öncesi' }));
    if (specific.kind === 'trailer') {
      if (specific.axles?.length) add('axles', { kind: 'axles' }, specific.axles.map((count) => `${count} Aks`).join(', '));
    } else {
      if (specific.odometerKm) add('odometerKm', { kind: 'odometerKm' }, rangeLabel(specific.odometerKm, formatInteger, { suffix: 'km', ...AT_LEAST_MOST }));
      if (specific.driveConfigs?.length) add('driveConfigs', { kind: 'driveConfigs' }, specific.driveConfigs.join(', '));
    }
  }
  return chips;
}

/** "Filtre · N" sayacı: arama metni dışındaki etkin koşul grupları. */
export const activeFilterCount = (search: ListingSearch): number => searchChips(search).filter((chip) => chip.isFilter).length;

function omit<T extends object>(value: T, key: string): T {
  const copy = { ...value } as Record<string, unknown>;
  delete copy[key];
  return copy as T;
}

/** Çipin temsil ettiği koşulu aramadan kaldırır; sonuç yine normalize (`buildSearch` çıktısı) bir aramadır. */
export function removeChip(search: ListingSearch, id: SearchChipId): ListingSearch {
  if (id.kind === 'query') return { ...search, query: '' };
  if (id.kind === 'category') {
    const remaining = search.filters.categories.filter((categoryId) => categoryId !== id.categoryId);
    const rebuilt = buildSearch(withCategories(searchToDraft(search), remaining));
    return rebuilt.ok ? rebuilt.search : search;
  }
  const { filters } = search;
  if (id.kind === 'price' || id.kind === 'city' || id.kind === 'statuses' || id.kind === 'financing' || id.kind === 'subtypes') return { ...search, filters: omit(filters, id.kind) };
  return { ...search, filters: { ...filters, specific: omit(filters.specific, id.kind) } };
}

/** Başlık: tek/iki kategori adı ("Kamyon & Çekici"), çok kategoride sayı, hiç yoksa "Tüm İlanlar". */
export function searchTitle(search: ListingSearch): string {
  const { categories } = search.filters;
  if (categories.length === 0) return 'Tüm İlanlar';
  if (categories.length <= 2) return categories.map((id) => CATEGORY_CATALOG[id].name).join(' & ');
  return `${categories.length} kategori`;
}
