import {
  CAB_TYPE_LABELS,
  CATEGORY_CATALOG,
  computePlan,
  formatInteger,
  formatMoney,
  trustScore,
  type FinanceSettings,
  type ListingDetail,
} from '@/domain';

export type CompareRow = {
  readonly key: string;
  readonly label: string;
  /** İlan sırasıyla değerler; bilinmeyen değer `—`. */
  readonly values: readonly string[];
  /** Değerler birbirinden farklı mı (vurgulanır). Tek ilanda hep `false`. */
  readonly differs: boolean;
};

const DASH = '—';

/**
 * Karşılaştırma tablosu satırları (madde 4): fiyat, aynı peşinat/vadeyle tahmini aylık ödeme, model yılı, kilometre, marka/model, tip, teknik
 * bilgiler, güven puanı ve finansman. Hiçbir ilanda değeri olmayan satır gösterilmez.
 */
export function compareRows(listings: readonly ListingDetail[], finance: FinanceSettings | undefined): CompareRow[] {
  const vehicle = (l: ListingDetail) => (l.specs.group === 'vehicle' ? l.specs : null);
  const term = finance?.terms.length ? Math.max(...finance.terms) : null;

  const defs: { key: string; label: string; value: (l: ListingDetail) => string | undefined }[] = [
    { key: 'price', label: 'Fiyat', value: (l) => formatMoney(l.price) },
    {
      key: 'monthly',
      label: finance && term ? `Tahmini aylık (%${finance.minDownPaymentPercent} peşinat, ${term} ay)` : 'Tahmini aylık',
      value: (l) => {
        if (!finance || !term || l.price.amountKurus <= 0) return undefined;
        const plan = computePlan(l.price.amountKurus, Math.round((l.price.amountKurus * finance.minDownPaymentPercent) / 100), term, finance.monthlyRatePercent);
        return formatMoney({ amountKurus: plan.monthlyPaymentKurus, currency: 'TRY' });
      },
    },
    { key: 'year', label: 'Model yılı', value: (l) => (l.modelYear !== undefined ? String(l.modelYear) : undefined) },
    { key: 'km', label: 'Kilometre', value: (l) => (l.odometerKm !== undefined ? `${formatInteger(l.odometerKm)} km` : undefined) },
    { key: 'category', label: 'Kategori / tip', value: (l) => [CATEGORY_CATALOG[l.categoryId].name, l.subcategory].filter(Boolean).join(' · ') },
    {
      key: 'brand',
      label: 'Marka / model',
      value: (l) => {
        const s = l.specs.group === 'vehicle' || l.specs.group === 'trailer' ? l.specs : null;
        return s ? [s.brand, s.model].filter(Boolean).join(' ') || undefined : undefined;
      },
    },
    { key: 'tonnage', label: 'Tonaj', value: (l) => (vehicle(l)?.tonnage !== undefined ? `${formatInteger(vehicle(l)!.tonnage!)} ton` : undefined) },
    { key: 'power', label: 'Motor gücü', value: (l) => (vehicle(l)?.enginePowerHp !== undefined ? `${formatInteger(vehicle(l)!.enginePowerHp!)} HP` : undefined) },
    { key: 'cab', label: 'Kabin', value: (l) => (vehicle(l)?.cabType ? CAB_TYPE_LABELS[vehicle(l)!.cabType!] : undefined) },
    { key: 'drive', label: 'Çekiş', value: (l) => vehicle(l)?.driveConfig },
    { key: 'trust', label: 'Güven puanı', value: (l) => (l.insights ? `${trustScore(l.insights.checks)}/100` : undefined) },
    { key: 'financing', label: 'Finansman', value: (l) => l.financing ?? undefined },
    { key: 'location', label: 'Konum', value: (l) => l.location.city || undefined },
  ];

  return defs.flatMap((def) => {
    const raw = listings.map(def.value);
    if (raw.every((value) => value === undefined)) return [];
    const values = raw.map((value) => value ?? DASH);
    const differs = listings.length > 1 && new Set(values).size > 1;
    return [{ key: def.key, label: def.label, values, differs }];
  });
}
