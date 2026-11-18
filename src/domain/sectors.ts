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
  /** Madde 41/43: sektöre özel soruların cevapları (soru kimliği → seçenek kimliği). */
  readonly extras?: Readonly<Record<string, string>>;
};

/**
 * Bulucu cevaplarını aramaya çevirir: yük sınıfı kategoriyi, sektör kamyon alt türünü belirler, bütçe en yüksek fiyattır.
 * Ağır yükte uzun yol / soğuk zincir / sektörsüz → çekici; inşaat, tanker, tarım, dağıtım → ağır kamyon (sektörün alt türüyle).
 */
export function finderDraft(answers: FinderAnswers): FilterDraft {
  const { sector, maxPriceTl } = answers;
  const load = effectiveLoad(answers);
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

// --- Sektöre özel sorular (madde 41: inşaat, madde 43: şehir içi dağıtım) -----------------------------------------------

export type FinderQuestion = { readonly id: string; readonly label: string; readonly options: readonly { readonly id: string; readonly label: string }[] };

export const SECTOR_QUESTIONS: Partial<Record<SectorId, readonly FinderQuestion[]>> = {
  construction: [
    {
      id: 'terrain',
      label: 'Çalışma zemini',
      options: [
        { id: 'asphalt', label: 'Asfalt / düz yol' },
        { id: 'mixed', label: 'Karışık' },
        { id: 'offroad', label: 'Arazi / şantiye içi' },
      ],
    },
    {
      id: 'slope',
      label: 'Eğim',
      options: [
        { id: 'flat', label: 'Düz' },
        { id: 'moderate', label: 'Orta eğimli' },
        { id: 'steep', label: 'Dik rampa' },
      ],
    },
    {
      id: 'body',
      label: 'Taşınacak malzeme / damper tipi',
      options: [
        { id: 'standard', label: 'Kum, mıcır (standart damper)' },
        { id: 'hardox', label: 'Hafriyat (Hardox damper)' },
        { id: 'rock', label: 'Kaya, ağır taş (kaya tipi)' },
      ],
    },
  ],
  city_delivery: [
    {
      id: 'capacity',
      label: 'Taşıma kapasitesi',
      options: [
        { id: 'c1', label: '1,5 tona kadar' },
        { id: 'c2', label: '1,5 – 3,5 ton' },
        { id: 'c3', label: '3,5 ton üzeri' },
      ],
    },
    {
      id: 'volume',
      label: 'Kasa hacmi',
      options: [
        { id: 'small', label: '10 m³ altı' },
        { id: 'medium', label: '10 – 20 m³' },
        { id: 'large', label: '20 m³ üzeri' },
      ],
    },
    {
      id: 'usage',
      label: 'Günlük kullanım',
      options: [
        { id: 'low', label: '100 km altı' },
        { id: 'mid', label: '100 – 250 km' },
        { id: 'high', label: '250 km üzeri' },
      ],
    },
  ],
};

/** Şehir içi dağıtımda yük, kapasite cevabından türer (madde 43: kamyonet önerisi); diğer sektörlerde seçilen yük sınıfı. */
export function effectiveLoad(answers: FinderAnswers): LoadClass {
  if (answers.sector === 'city_delivery') {
    const capacity = answers.extras?.capacity;
    if (capacity === 'c1' || capacity === 'c2') return 'light';
    if (capacity === 'c3') return 'medium';
  }
  return answers.load;
}

/** Şehir içi dağıtımda yük sorusu yerine kapasite sorusu sorulur. */
export const asksLoad = (sector: SectorId | null) => sector !== 'city_delivery';

/** Cevaplardan danışman dilinde kısa öneriler (özet ekranı ve danışmana giden not). */
export function finderAdvice(answers: FinderAnswers): string[] {
  const x = answers.extras ?? {};
  const advice: string[] = [];
  if (answers.sector === 'construction') {
    if (x.terrain === 'offroad' || x.slope === 'steep') advice.push('Arazi ve dik rampada 6x4 çekişli, yüksek torklu bir araç önerilir.');
    else if (x.terrain === 'mixed' || x.slope === 'moderate') advice.push('Karışık zeminde 6x4 ya da diferansiyel kilitli 6x2 uygun olur.');
    else if (x.terrain === 'asphalt') advice.push('Asfaltta 4x2 / 6x2 yeterlidir; yakıt tüketimi daha düşüktür.');
    if (x.body === 'hardox') advice.push('Hafriyat için aşınmaya dayanıklı Hardox damper kasa önerilir.');
    if (x.body === 'rock') advice.push('Kaya ve ağır taş için kaya tipi (güçlendirilmiş) damper önerilir.');
    if (x.body === 'standard') advice.push('Kum ve mıcır için standart damper kasa yeterlidir.');
  }
  if (answers.sector === 'city_delivery') {
    if (x.capacity === 'c1') advice.push('1,5 tona kadar yük için kamyonet en ekonomik seçenektir.');
    if (x.capacity === 'c2') advice.push('1,5 – 3,5 ton için kasalı kamyonet / hafif ticari araç önerilir.');
    if (x.capacity === 'c3') advice.push('3,5 ton üzeri için kasalı kamyon önerilir.');
    if (x.volume === 'large') advice.push('20 m³ üzeri hacim için uzun şasili, yüksek kasalı araç gerekir.');
    if (x.usage === 'high') advice.push('Günde 250 km üzeri kullanımda yakıt tüketimi düşük, otomatik vitesli model rahat eder.');
    if (x.usage === 'low') advice.push('Kısa mesafeli dağıtımda küçük ve çevik bir araç trafikte avantaj sağlar.');
  }
  return advice;
}
