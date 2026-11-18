import type { CategoryId } from './categories';
import { EMPTY_FILTER_DRAFT, EMPTY_SPECIFIC_DRAFT, buildSearch, type FilterDraft } from './filterForm';
import { EMPTY_SEARCH, type ListingSearch } from './filters';

/**
 * Sektöre göre başlangıç (madde 1) ve akıllı araç bulucu (madde 2). Kullanıcı aracı hangi iş için kullanacağını seçer; ana sayfa o sektöre
 * uygun araç türlerini öne çıkarır, araç bulucu seçimi yük ve bütçeyle birlikte aramaya çevirir.
 */
export type SectorId = 'construction' | 'logistics' | 'city_delivery' | 'cold_chain' | 'tanker' | 'agriculture';

export type SectorShortcut = { readonly key: string; readonly label: string; readonly draft: FilterDraft };

export type Sector = {
  readonly id: SectorId;
  readonly label: string;
  /** MaterialCommunityIcons adı (`mci:` öneki olmadan değil; doğrudan Icon adı). */
  readonly icon: `mci:${string}`;
  readonly description: string;
  /** Orta boy (kamyon) araçta öne çıkan alt tür; yoksa tüm kamyonlar. */
  readonly truckSubtype?: string;
  /** Ana sayfada gösterilen hazır aramalar. */
  readonly shortcuts: readonly SectorShortcut[];
};

const draft = (categories: CategoryId[], subtypes: string[] = []): FilterDraft => ({ ...EMPTY_FILTER_DRAFT, categories, subtypes, specific: EMPTY_SPECIFIC_DRAFT });

export const SECTORS: readonly Sector[] = [
  {
    id: 'construction',
    label: 'İnşaat / şantiye',
    icon: 'mci:excavator',
    description: 'Hafriyat, malzeme ve şantiye taşımacılığı',
    truckSubtype: 'Damperli',
    shortcuts: [
      { key: 'damperli', label: 'Damperli kamyon', draft: draft(['kamyon'], ['Damperli']) },
      { key: 'damper-dorse', label: 'Damper dorse', draft: draft(['dorse'], ['Damper']) },
      { key: 'cekici', label: 'Çekici', draft: draft(['cekici']) },
    ],
  },
  {
    id: 'logistics',
    label: 'Lojistik / uzun yol',
    icon: 'mci:truck-trailer',
    description: 'Şehirlerarası ve uluslararası yük taşımacılığı',
    truckSubtype: 'Kasalı',
    shortcuts: [
      { key: 'cekici', label: 'Çekici', draft: draft(['cekici']) },
      { key: 'dorse', label: 'Dorse', draft: draft(['dorse']) },
      { key: 'kasali', label: 'Kasalı kamyon', draft: draft(['kamyon'], ['Kasalı']) },
    ],
  },
  {
    id: 'city_delivery',
    label: 'Şehir içi dağıtım',
    icon: 'mci:van-utility',
    description: 'Mağaza, market ve kargo dağıtımı',
    truckSubtype: 'Kasalı',
    shortcuts: [
      { key: 'kamyonet', label: 'Kamyonet', draft: draft(['ticari-arac']) },
      { key: 'kasali', label: 'Kasalı kamyon', draft: draft(['kamyon'], ['Kasalı']) },
      { key: 'frigorifik', label: 'Frigorifik', draft: draft(['kamyon'], ['Frigorifik']) },
    ],
  },
  {
    id: 'cold_chain',
    label: 'Soğuk zincir',
    icon: 'mci:snowflake',
    description: 'Gıda, ilaç ve soğutmalı taşımacılık',
    truckSubtype: 'Frigorifik',
    shortcuts: [
      { key: 'frigorifik', label: 'Frigorifik kamyon', draft: draft(['kamyon'], ['Frigorifik']) },
      { key: 'cekici', label: 'Çekici', draft: draft(['cekici']) },
    ],
  },
  {
    id: 'tanker',
    label: 'Akaryakıt / tanker',
    icon: 'mci:tanker-truck',
    description: 'Akaryakıt, su ve sıvı taşımacılığı',
    truckSubtype: 'Tanker',
    shortcuts: [
      { key: 'tanker', label: 'Tanker', draft: draft(['kamyon'], ['Tanker']) },
      { key: 'cekici', label: 'Çekici', draft: draft(['cekici']) },
    ],
  },
  {
    id: 'agriculture',
    label: 'Tarım / hayvancılık',
    icon: 'mci:tractor-variant',
    description: 'Ürün, yem ve hayvan taşımacılığı',
    truckSubtype: 'Kasalı',
    shortcuts: [
      { key: 'kasali', label: 'Kasalı kamyon', draft: draft(['kamyon'], ['Kasalı']) },
      { key: 'damperli', label: 'Damperli kamyon', draft: draft(['kamyon'], ['Damperli']) },
      { key: 'kamyonet', label: 'Kamyonet', draft: draft(['ticari-arac']) },
    ],
  },
];

export const isSectorId = (value: unknown): value is SectorId => typeof value === 'string' && SECTORS.some((sector) => sector.id === value);

export const sectorById = (id: SectorId): Sector => SECTORS.find((sector) => sector.id === id) ?? SECTORS[0];

/** Hazır aramayı normalize aramaya çevirir. */
export function shortcutSearch(shortcut: SectorShortcut): ListingSearch {
  const built = buildSearch(shortcut.draft);
  return built.ok ? built.search : EMPTY_SEARCH;
}

// --- Akıllı araç bulucu (madde 2) ------------------------------------------------------------------------------------

/** Taşınacak yük / araç büyüklüğü. */
export type LoadClass = 'light' | 'medium' | 'heavy';

export const LOAD_CLASSES: readonly { readonly id: LoadClass; readonly label: string; readonly description: string; readonly icon: `mci:${string}` }[] = [
  { id: 'light', label: 'Hafif yük', description: '3,5 tona kadar · kamyonet', icon: 'mci:van-utility' },
  { id: 'medium', label: 'Orta yük', description: '3,5 – 18 ton · kamyon', icon: 'mci:truck' },
  { id: 'heavy', label: 'Ağır yük', description: '18 ton üzeri · çekici / ağır kamyon', icon: 'mci:truck-trailer' },
];

export type FinderAnswers = {
  readonly sector: SectorId | null;
  readonly load: LoadClass;
  /** En yüksek fiyat (TL); bütçe girilmediyse `null`. */
  readonly maxPriceTl: number | null;
};

/**
 * Bulucu cevaplarını aramaya çevirir: yük sınıfı kategoriyi, sektör kamyon alt türünü belirler, bütçe en yüksek fiyattır.
 * Ağır yükte uzun yol / soğuk zincir / sektörsüz → çekici; inşaat, tanker, tarım, dağıtım → ağır kamyon (sektörün alt türüyle).
 */
export function finderDraft({ sector, load, maxPriceTl }: FinderAnswers): FilterDraft {
  const info = sector ? sectorById(sector) : null;
  let categories: CategoryId[];
  let subtypes: string[] = [];
  if (load === 'light') {
    categories = ['ticari-arac'];
  } else if (load === 'medium') {
    categories = ['kamyon'];
    if (info?.truckSubtype) subtypes = [info.truckSubtype];
  } else if (!sector || sector === 'logistics' || sector === 'cold_chain') {
    categories = ['cekici'];
  } else {
    categories = ['kamyon'];
    if (info?.truckSubtype) subtypes = [info.truckSubtype];
  }
  return {
    ...EMPTY_FILTER_DRAFT,
    categories,
    subtypes,
    priceMaxTl: maxPriceTl && maxPriceTl > 0 ? String(Math.floor(maxPriceTl)) : '',
    specific: EMPTY_SPECIFIC_DRAFT,
  };
}

export function finderSearch(answers: FinderAnswers): ListingSearch {
  const built = buildSearch(finderDraft(answers));
  return built.ok ? built.search : EMPTY_SEARCH;
}
