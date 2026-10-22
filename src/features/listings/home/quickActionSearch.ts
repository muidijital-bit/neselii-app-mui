import { buildSearch, EMPTY_FILTER_DRAFT, EMPTY_SEARCH, EMPTY_SPECIFIC_DRAFT, type FilterDraft, type ListingSearch } from '@/domain';

const draft = (patch: Partial<FilterDraft>): FilterDraft => ({ ...EMPTY_FILTER_DRAFT, ...patch });

/**
 * `@/ui/home/QuickActions` kısayollarının arama karşılığı (main'deki filtrelerin aynısı): kategori/alt tür, taksitli = finansman,
 * 2020+ = en düşük model yılı, 1 Milyon altı = en çok 1.000.000 TL, Kamyonet = ticari araç kategorisi.
 */
const QUICK_ACTION_DRAFTS: Readonly<Record<string, FilterDraft>> = {
  cekici: draft({ categories: ['cekici'] }),
  damperli: draft({ categories: ['kamyon'], subtypes: ['Damperli'] }),
  taksit: draft({ financing: true }),
  yeni: draft({ specific: { ...EMPTY_SPECIFIC_DRAFT, modelYearMin: '2020' } }),
  kasali: draft({ categories: ['kamyon'], subtypes: ['Kasalı'] }),
  uygun: draft({ priceMaxTl: '1000000' }),
  tanker: draft({ categories: ['kamyon'], subtypes: ['Tanker'] }),
  kamyonet: draft({ categories: ['ticari-arac'] }),
};

/** Kısayol anahtarı → normalize arama; bilinmeyen anahtar tüm ilanları açar. */
export function quickActionSearch(key: string): ListingSearch {
  const source = QUICK_ACTION_DRAFTS[key];
  if (!source) return EMPTY_SEARCH;
  const built = buildSearch(source);
  return built.ok ? built.search : EMPTY_SEARCH;
}
