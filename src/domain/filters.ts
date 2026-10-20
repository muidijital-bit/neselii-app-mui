import { CATEGORY_CATALOG, type CategoryId } from './categories';
import type { Range } from './common';
import type { DriveConfig, RoomCount, SearchableStatus, TrailerAxles } from './listing';

/** Tüm kategorilerde geçerli alanlar: kategori değişince korunur (PRODUCT.md). Fiyat aralığı kuruştur. */
export type CommonFilters = {
  readonly price?: Range;
  readonly city?: string;
  readonly statuses?: readonly SearchableStatus[];
  /** Yalnızca finansman seçeneği (taksit/kredi) olan ilanlar. */
  readonly financing?: boolean;
  /** Alt türler (`Damperli`, `Kasalı`…); boş = hepsi. */
  readonly subtypes?: readonly string[];
};

/**
 * Kategoriye özel alanlar; kategori değişince temizlenir. Alanlar tasarım ekranı 05'ten çıkarılmıştır:
 * araçta marka / model yılı / kilometre (+ çekici-kamyonda aks düzeni), dorsede aks sayısı,
 * gayrimenkulde alan (m²) ve oda sayısı. Aralıklar `Range` (sayı), seçenekler birer birleşim türüdür.
 */
export type SpecificFilters =
  | {
      readonly kind: 'vehicle';
      readonly brand?: string;
      readonly modelYear?: Range;
      readonly odometerKm?: Range;
      /** Yalnızca kamyon/çekici seçiliyken anlamlıdır. */
      readonly driveConfigs?: readonly DriveConfig[];
    }
  | {
      readonly kind: 'trailer';
      readonly brand?: string;
      readonly modelYear?: Range;
      readonly axles?: readonly TrailerAxles[];
    }
  | {
      readonly kind: 'estate';
      readonly areaM2?: Range;
      /** Yalnızca gayrimenkulde (arsada oda yok). */
      readonly rooms?: readonly RoomCount[];
    };

export type SpecificFilterKind = SpecificFilters['kind'];

export type ListingFilters = CommonFilters & {
  /** Boş = tüm kategoriler. */
  readonly categories: readonly CategoryId[];
  readonly specific: SpecificFilters;
};

/** Servis sıralaması. Yakınlık sıralaması cihazda yapılır (konum backend'e gitmez), burada yoktur. */
export type ListingSort = 'newest' | 'price-asc' | 'price-desc';

/** Arama metni + filtre + sıra: aramanın tamamı. Kayıtlı arama aynısını saklar ("aynı filtre/sıra açar"). */
export type ListingSearch = {
  /** Kırpılmış serbest metin; boş = metin yok. Kategori değişince korunur. */
  readonly query: string;
  readonly filters: ListingFilters;
  readonly sort: ListingSort;
};

/**
 * Seçili kategorilerden hangi özel filtre ailesinin gösterildiği (tasarım `AppScreen` kuralı):
 * yalnızca gayrimenkul/arsa → `estate`; yalnızca dorse → `trailer`; aksi halde (boş seçim dahil) `vehicle`.
 */
export function specificKindFor(categories: readonly CategoryId[]): SpecificFilterKind {
  if (categories.length > 0 && categories.every((id) => CATEGORY_CATALOG[id].group === 'estate' || CATEGORY_CATALOG[id].group === 'land')) {
    return 'estate';
  }
  if (categories.length === 1 && categories[0] === 'dorse') return 'trailer';
  return 'vehicle';
}

export const emptySpecificFilters = (kind: SpecificFilterKind): SpecificFilters => ({ kind });

export const EMPTY_FILTERS: ListingFilters = { categories: [], specific: { kind: 'vehicle' } };

export const EMPTY_SEARCH: ListingSearch = { query: '', filters: EMPTY_FILTERS, sort: 'newest' };
