import { z } from 'zod';

import { CATEGORY_IDS, type CategoryId } from './categories';
import type { Range } from './common';
import { specificKindFor, type ListingFilters, type ListingSearch, type ListingSort, type SpecificFilters } from './filters';
import type { DriveConfig, RoomCount, SearchableStatus, TrailerAxles } from './listing';

/**
 * Filtre formu (ekran 05): kullanıcının yazdığı METİN taslağı ile servise giden normalize `ListingSearch` arasındaki saf kurallar.
 * Sayı alanları metin olarak tutulur ama hiçbir yerde metin olarak karşılaştırılmaz: önce tam sayıya çevrilir, sonra karşılaştırılır.
 * Fiyat arayüzde TL, domain/servis aralığında tam sayı kuruştur.
 */

export type SpecificDraft = {
  readonly brand: string;
  readonly modelYearMin: string;
  readonly modelYearMax: string;
  readonly odometerMin: string;
  readonly odometerMax: string;
  readonly driveConfigs: readonly DriveConfig[];
  readonly axles: readonly TrailerAxles[];
  readonly areaMin: string;
  readonly areaMax: string;
  readonly rooms: readonly RoomCount[];
};

export type FilterDraft = {
  /** Arama metni ve sıra formda düzenlenmez ama kategori değişince ve uygulayınca korunur. */
  readonly query: string;
  readonly sort: ListingSort;
  readonly categories: readonly CategoryId[];
  readonly city: string;
  readonly priceMinTl: string;
  readonly priceMaxTl: string;
  readonly statuses: readonly SearchableStatus[];
  readonly financing: boolean;
  readonly subtypes: readonly string[];
  readonly specific: SpecificDraft;
};

export const EMPTY_SPECIFIC_DRAFT: SpecificDraft = {
  brand: '',
  modelYearMin: '',
  modelYearMax: '',
  odometerMin: '',
  odometerMax: '',
  driveConfigs: [],
  axles: [],
  areaMin: '',
  areaMax: '',
  rooms: [],
};

export const EMPTY_FILTER_DRAFT: FilterDraft = {
  query: '',
  sort: 'newest',
  categories: [],
  city: '',
  priceMinTl: '',
  priceMaxTl: '',
  statuses: [],
  financing: false,
  subtypes: [],
  specific: EMPTY_SPECIFIC_DRAFT,
};

/** Rota parametresinden gelen başlangıç kategorisi: geçerli kimlik → o kategori, aksi halde (yok/geçersiz/dizi) tüm kategoriler. */
export function initialDraftForCategory(categoryId: unknown): FilterDraft {
  return typeof categoryId === 'string' && (CATEGORY_IDS as readonly string[]).includes(categoryId)
    ? { ...EMPTY_FILTER_DRAFT, categories: [categoryId as CategoryId] }
    : EMPTY_FILTER_DRAFT;
}

/**
 * Kategori seçimi değişir: kategoriye özel alanlar HER ZAMAN temizlenir (aynı aileye geçilse de); ortak alanlar (fiyat, şehir, durum)
 * ile arama metni/sıra korunur.
 */
export function withCategories(draft: FilterDraft, categories: readonly CategoryId[]): FilterDraft {
  return { ...draft, categories, specific: EMPTY_SPECIFIC_DRAFT };
}

/** Bir kategoriyi seçili/seçili değil yapar; seçim sırası katalog sırasıdır (aynı seçim her zaman aynı diziyi verir). */
export function toggleCategory(draft: FilterDraft, id: CategoryId): FilterDraft {
  const next = draft.categories.includes(id) ? draft.categories.filter((c) => c !== id) : [...draft.categories, id];
  return withCategories(
    draft,
    CATEGORY_IDS.filter((c) => next.includes(c)),
  );
}

/** "Temizle": tüm filtreler gider; arama metni ve sıra aramanın parçası olduğundan kalır. */
export const clearDraft = (draft: FilterDraft): FilterDraft => ({ ...EMPTY_FILTER_DRAFT, query: draft.query, sort: draft.sort });

// --- Sayı ayrıştırma ------------------------------------------------------------------------------------------------

export type ParsedNumber = { readonly kind: 'empty' } | { readonly kind: 'invalid' } | { readonly kind: 'value'; readonly value: number };

/**
 * Negatif olmayan tam sayı. Boşluk kırpılır; boş → `empty` (uç yok). Yalnızca rakam ya da tr-TR binlik noktalı rakam
 * (`1.250.000`) kabul edilir; işaret, ondalık, üstel (`1e3`), `NaN`/`Infinity` ve güvenli tam sayıyı aşan değerler `invalid` olur.
 * Sıfır geçerlidir.
 */
export function parseWholeNumber(text: string): ParsedNumber {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(trimmed)) return { kind: 'invalid' };
  const value = Number(trimmed.replace(/\./g, ''));
  return Number.isSafeInteger(value) ? { kind: 'value', value } : { kind: 'invalid' };
}

/** TL (tam sayı) → tam sayı kuruş. Çarpım güvenli tam sayıyı aşıyorsa `invalid`. */
export function parseTlToKurus(text: string): ParsedNumber {
  const parsed = parseWholeNumber(text);
  if (parsed.kind !== 'value') return parsed;
  const kurus = parsed.value * 100;
  return Number.isSafeInteger(kurus) ? { kind: 'value', value: kurus } : { kind: 'invalid' };
}

/** Kuruş → formda gösterilecek TL metni (kayıtlı aramayı formda yeniden açmak için). Kuruş tam liraya inmiyorsa aşağı yuvarlanır. */
export const kurusToTlText = (kurus: number): string => String(Math.floor(kurus / 100));

// --- Doğrulama + normalize arama -------------------------------------------------------------------------------------

export type FilterField = 'price' | 'modelYear' | 'odometerKm' | 'areaM2';
export type FilterErrors = Partial<Record<FilterField, string>>;
export type BuildSearchResult = { readonly ok: true; readonly search: ListingSearch } | { readonly ok: false; readonly errors: FilterErrors };

const ERROR_INVALID = 'Geçerli bir sayı girin.';
const ERROR_ORDER = 'En az değer en çok değerden büyük olamaz.';

type RangeParse = { readonly range: Range | undefined; readonly error?: string };

function buildRange(minText: string, maxText: string, convert: (text: string) => ParsedNumber): RangeParse {
  const min = convert(minText);
  const max = convert(maxText);
  if (min.kind === 'invalid' || max.kind === 'invalid') return { range: undefined, error: ERROR_INVALID };
  const lo = min.kind === 'value' ? min.value : undefined;
  const hi = max.kind === 'value' ? max.value : undefined;
  if (lo !== undefined && hi !== undefined && lo > hi) return { range: undefined, error: ERROR_ORDER };
  if (lo === undefined && hi === undefined) return { range: undefined };
  return { range: { ...(lo !== undefined ? { min: lo } : {}), ...(hi !== undefined ? { max: hi } : {}) } };
}

const STATUS_ORDER: readonly SearchableStatus[] = ['published', 'reserved', 'sold'];
const DRIVE_ORDER: readonly DriveConfig[] = ['4x2', '6x2', '6x4'];
const AXLE_ORDER: readonly TrailerAxles[] = [2, 3, 4];
const ROOM_ORDER: readonly RoomCount[] = ['1+1', '2+1', '3+1', '4+1'];

/** Kanonik sıra + tekilleştirme; boşsa `undefined` (alan hiç yazılmaz). */
const pick = <T>(order: readonly T[], chosen: readonly T[]): readonly T[] | undefined => {
  const result = order.filter((item) => chosen.includes(item));
  return result.length > 0 ? result : undefined;
};

/** Sürüş düzeni yalnızca kamyon/çekici seçiliyken (ya da kategori seçilmemişken) anlamlıdır; oda yalnızca gayrimenkulde. */
export const showsDriveConfigs = (categories: readonly CategoryId[]): boolean =>
  categories.length === 0 || categories.includes('kamyon') || categories.includes('cekici');
export const showsRooms = (categories: readonly CategoryId[]): boolean => categories.includes('gayrimenkul');

function buildSpecific(draft: FilterDraft, errors: FilterErrors): SpecificFilters {
  const kind = specificKindFor(draft.categories);
  const { specific: s } = draft;
  const brand = s.brand.trim();
  if (kind === 'estate') {
    const area = buildRange(s.areaMin, s.areaMax, parseWholeNumber);
    if (area.error) errors.areaM2 = area.error;
    const rooms = showsRooms(draft.categories) ? pick(ROOM_ORDER, s.rooms) : undefined;
    return { kind, ...(area.range ? { areaM2: area.range } : {}), ...(rooms ? { rooms } : {}) };
  }
  const year = buildRange(s.modelYearMin, s.modelYearMax, parseWholeNumber);
  if (year.error) errors.modelYear = year.error;
  if (kind === 'trailer') {
    const axles = pick(AXLE_ORDER, s.axles);
    return { kind, ...(brand ? { brand } : {}), ...(year.range ? { modelYear: year.range } : {}), ...(axles ? { axles } : {}) };
  }
  const odometer = buildRange(s.odometerMin, s.odometerMax, parseWholeNumber);
  if (odometer.error) errors.odometerKm = odometer.error;
  const driveConfigs = showsDriveConfigs(draft.categories) ? pick(DRIVE_ORDER, s.driveConfigs) : undefined;
  return {
    kind,
    ...(brand ? { brand } : {}),
    ...(year.range ? { modelYear: year.range } : {}),
    ...(odometer.range ? { odometerKm: odometer.range } : {}),
    ...(driveConfigs ? { driveConfigs } : {}),
  };
}

/** Taslağı doğrular ve normalize `ListingSearch` üretir: boş uçlar/alanlar yazılmaz, sayılar sayı, fiyat kuruştur. */
export function buildSearch(draft: FilterDraft): BuildSearchResult {
  const errors: FilterErrors = {};
  const price = buildRange(draft.priceMinTl, draft.priceMaxTl, parseTlToKurus);
  if (price.error) errors.price = price.error;
  const specific = buildSpecific(draft, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const city = draft.city.trim();
  const statuses = pick(STATUS_ORDER, draft.statuses);
  const subtypes = Array.from(new Set(draft.subtypes.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  const filters: ListingFilters = {
    categories: CATEGORY_IDS.filter((id) => draft.categories.includes(id)),
    ...(price.range ? { price: price.range } : {}),
    ...(city ? { city } : {}),
    ...(statuses ? { statuses } : {}),
    ...(draft.financing ? { financing: true } : {}),
    ...(subtypes.length > 0 ? { subtypes } : {}),
    specific,
  };
  return { ok: true, search: { query: draft.query.trim(), filters, sort: draft.sort } };
}

/** Normalize aramayı forma geri açar (010'dan "Filtre" çipiyle dönüş). `buildSearch(searchToDraft(s))` aynı aramayı verir. */
export function searchToDraft(search: ListingSearch): FilterDraft {
  const { filters } = search;
  const text = (value: number | undefined) => (value === undefined ? '' : String(value));
  const base: FilterDraft = {
    ...EMPTY_FILTER_DRAFT,
    query: search.query,
    sort: search.sort,
    categories: filters.categories,
    city: filters.city ?? '',
    priceMinTl: filters.price?.min === undefined ? '' : kurusToTlText(filters.price.min),
    priceMaxTl: filters.price?.max === undefined ? '' : kurusToTlText(filters.price.max),
    statuses: filters.statuses ?? [],
    financing: filters.financing === true,
    subtypes: filters.subtypes ?? [],
  };
  const { specific } = filters;
  if (specific.kind === 'estate') {
    return { ...base, specific: { ...EMPTY_SPECIFIC_DRAFT, areaMin: text(specific.areaM2?.min), areaMax: text(specific.areaM2?.max), rooms: specific.rooms ?? [] } };
  }
  const common = { ...EMPTY_SPECIFIC_DRAFT, brand: specific.brand ?? '', modelYearMin: text(specific.modelYear?.min), modelYearMax: text(specific.modelYear?.max) };
  if (specific.kind === 'trailer') return { ...base, specific: { ...common, axles: specific.axles ?? [] } };
  return {
    ...base,
    specific: { ...common, odometerMin: text(specific.odometerKm?.min), odometerMax: text(specific.odometerKm?.max), driveConfigs: specific.driveConfigs ?? [] },
  };
}

// --- Rota sözleşmesi (009 → 010) -------------------------------------------------------------------------------------

const rangeSchema = z.object({ min: z.number().optional(), max: z.number().optional() }).strict();
const searchSchema = z
  .object({
    query: z.string(),
    sort: z.enum(['newest', 'price-asc', 'price-desc']),
    filters: z
      .object({
        categories: z.array(z.enum(CATEGORY_IDS)),
        price: rangeSchema.optional(),
        city: z.string().optional(),
        statuses: z.array(z.enum(['published', 'reserved', 'sold'])).optional(),
        financing: z.literal(true).optional(),
        subtypes: z.array(z.string().min(1).max(40)).max(10).optional(),
        specific: z.discriminatedUnion('kind', [
          z
            .object({
              kind: z.literal('vehicle'),
              brand: z.string().optional(),
              modelYear: rangeSchema.optional(),
              odometerKm: rangeSchema.optional(),
              driveConfigs: z.array(z.enum(['4x2', '6x2', '6x4'])).optional(),
            })
            .strict(),
          z
            .object({
              kind: z.literal('trailer'),
              brand: z.string().optional(),
              modelYear: rangeSchema.optional(),
              axles: z.array(z.union([z.literal(2), z.literal(3), z.literal(4)])).optional(),
            })
            .strict(),
          z
            .object({
              kind: z.literal('estate'),
              areaM2: rangeSchema.optional(),
              rooms: z.array(z.enum(['1+1', '2+1', '3+1', '4+1'])).optional(),
            })
            .strict(),
        ]),
      })
      .strict(),
  })
  .strict();

/** `ListingSearch` → tek rota parametresi (JSON). 010 sonuç ekranı aynı sözleşmeyi `decodeSearchParam` ile okur. */
export const encodeSearchParam = (search: ListingSearch): string => JSON.stringify(search);

/**
 * Rota parametresi → normalize `ListingSearch`; yok/bozuk/geçersiz (şema, negatif/sonlu olmayan sayı, min>max, aile uyuşmazlığı) → `null`.
 * Kodu çözülen değer form kurallarından yeniden geçirilir; sonuç her zaman `buildSearch` çıktısıdır.
 */
export function decodeSearchParam(raw: unknown): ListingSearch | null {
  if (typeof raw !== 'string') return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = searchSchema.safeParse(json);
  if (!parsed.success) return null;
  const search = parsed.data as ListingSearch;
  if (search.filters.specific.kind !== specificKindFor(search.filters.categories)) return null;
  const { price } = search.filters;
  if ((price?.min ?? 0) % 100 !== 0 || (price?.max ?? 0) % 100 !== 0) return null; // arayüz yalnızca tam lira üretir
  const rebuilt = buildSearch(searchToDraft(search));
  return rebuilt.ok ? rebuilt.search : null;
}
