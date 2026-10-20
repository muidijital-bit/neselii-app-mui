/** Sekiz sabit kategori (PRODUCT.md, tasarım `AppScreen` CATS). Kimlik = sabit slug. */
export const CATEGORY_IDS = ['kamyon', 'cekici', 'dorse', 'otomobil', 'ticari-arac', 'is-makinesi', 'gayrimenkul', 'arsa'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Kategori grupları: filtre ve özellik alanları gruba göre değişir. */
export type CategoryGroup = 'vehicle' | 'trailer' | 'estate' | 'land';

export type CategoryIconKey = 'truck' | 'route' | 'container' | 'car' | 'bus' | 'forklift' | 'building-2' | 'land-plot';

export type CategoryDefinition = {
  readonly id: CategoryId;
  readonly name: string;
  readonly group: CategoryGroup;
  /** Tasarımdaki alt tür satırı: `Damperli · Kasalı · Frigorifik · Tanker`. */
  readonly subcategories: readonly string[];
  /** Lucide ikon adı (UI `Icon` bileşeniyle eşlenir; domain UI'ya bağımlı olmaz). */
  readonly icon: CategoryIconKey;
};

/** Servisin döndürdüğü kategori: tanım + yayındaki ilan sayısı. */
export type Category = CategoryDefinition & { readonly listingCount: number };

/** Kategori kataloğu sabittir (ürün kararı); sayılar servisten gelir. Sıra tasarımdaki sıradır. */
export const CATEGORY_CATALOG: Readonly<Record<CategoryId, CategoryDefinition>> = {
  kamyon: { id: 'kamyon', name: 'Kamyon', group: 'vehicle', subcategories: ['Damperli', 'Kasalı', 'Frigorifik', 'Tanker'], icon: 'truck' },
  cekici: { id: 'cekici', name: 'Çekici', group: 'vehicle', subcategories: ['4x2', '6x2', '6x4'], icon: 'route' },
  dorse: { id: 'dorse', name: 'Dorse', group: 'trailer', subcategories: ['Damper', 'Tenteli', 'Lowbed', 'Silobas'], icon: 'container' },
  otomobil: { id: 'otomobil', name: 'Otomobil', group: 'vehicle', subcategories: ['Sedan', 'Hatchback', 'SUV'], icon: 'car' },
  'ticari-arac': { id: 'ticari-arac', name: 'Ticari Araç', group: 'vehicle', subcategories: ['Panelvan', 'Minibüs', 'Kamyonet'], icon: 'bus' },
  'is-makinesi': { id: 'is-makinesi', name: 'İş Makinesi', group: 'vehicle', subcategories: ['Yükleyici', 'Ekskavatör', 'Forklift'], icon: 'forklift' },
  gayrimenkul: { id: 'gayrimenkul', name: 'Gayrimenkul', group: 'estate', subcategories: ['Konut', 'İş Yeri', 'Depo'], icon: 'building-2' },
  arsa: { id: 'arsa', name: 'Arsa', group: 'land', subcategories: ['Sanayi', 'Ticari', 'Tarla'], icon: 'land-plot' },
};

export const isCategoryId = (value: unknown): value is CategoryId => typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
