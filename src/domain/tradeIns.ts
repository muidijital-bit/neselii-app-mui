import { computePlan, type FinanceSettings } from './finance';
import type { DamageStatus } from './listing';

/**
 * Takas ve araç alım süreci (Adım 7): müşteri kendi aracını takasa vermek (madde 35) ya da yalnızca satmak (madde 40) için araç bilgilerini ve
 * dış / iç / motor / kasa fotoğraf-videolarını (madde 36) gönderir; danışman ön değerlendirme aralığını girer (madde 37); seçilen ilanla takas
 * farkı ve aylık taksiti hesaplanır (madde 38); ekspertiz randevusu talep randevusuyla verilir (madde 39).
 */
export type TradeInKind = 'trade_in' | 'sell_vehicle';

export type TradeInCategory = 'kamyon' | 'cekici' | 'dorse' | 'ticari-arac';

export const TRADE_IN_CATEGORIES: readonly { readonly id: TradeInCategory; readonly label: string }[] = [
  { id: 'kamyon', label: 'Kamyon' },
  { id: 'cekici', label: 'Çekici' },
  { id: 'dorse', label: 'Dorse' },
  { id: 'ticari-arac', label: 'Ticari araç' },
];

export const DAMAGE_OPTIONS: readonly { readonly id: DamageStatus; readonly label: string }[] = [
  { id: 'none', label: 'Hasarsız' },
  { id: 'repaired', label: 'Boyalı / değişen' },
  { id: 'damaged', label: 'Hasarlı' },
];

export type TradeInSection = 'exterior' | 'interior' | 'engine' | 'body';

export const TRADE_IN_SECTIONS: readonly { readonly id: TradeInSection; readonly label: string; readonly hint: string }[] = [
  { id: 'exterior', label: 'Dış görünüm', hint: 'Ön, arka ve yanlar' },
  { id: 'interior', label: 'Kabin içi', hint: 'Koltuklar, gösterge, kilometre' },
  { id: 'engine', label: 'Motor', hint: 'Motor bölmesi, soğuk çalıştırma videosu' },
  { id: 'body', label: 'Kasa / üstyapı', hint: 'Kasa, damper, şasi' },
];

/** Bölüm başına en çok dosya. */
export const MAX_MEDIA_PER_SECTION = 6;

export type KurusRange = { readonly minKurus: number; readonly maxKurus: number };

export type TradeInVehicle = {
  readonly category: TradeInCategory;
  readonly brand: string;
  readonly model: string | null;
  readonly year: number | null;
  readonly km: number | null;
  readonly damageStatus: DamageStatus | null;
  readonly expectedPriceKurus: number | null;
  /** Danışmanın ön değerlendirmesi; girilmediyse `null`. */
  readonly valuation: KurusRange | null;
  readonly valuatedAt: string | null;
};

export type TradeInVehicleInput = Omit<TradeInVehicle, 'valuation' | 'valuatedAt'>;

export type TradeInMedia = {
  readonly id: string;
  readonly section: TradeInSection;
  readonly kind: 'photo' | 'video';
  /** Süreli imzalı adres (özel depolama); alınamazsa `null`. */
  readonly uri: string | null;
};

export type TradeInDetail = { readonly vehicle: TradeInVehicle; readonly media: readonly TradeInMedia[] };

/** Yüklenecek yerel dosya (görsel seçiciden). */
export type TradeInUpload = { readonly uri: string; readonly section: TradeInSection; readonly kind: 'photo' | 'video'; readonly mimeType: string | null };

/**
 * Madde 38: takas farkı = alınacak ilanın fiyatı − aracın değerlendirme aralığı. Değerlendirmenin üst ucu farkın alt ucunu verir; fark 0'ın
 * altına düşmez (araç daha değerliyse müşteriye ödeme yapılır, bu durumda `customerReceives` true).
 */
export function tradeDifference(listingPriceKurus: number, valuation: KurusRange): { range: KurusRange; customerReceives: boolean } {
  const low = listingPriceKurus - valuation.maxKurus;
  const high = listingPriceKurus - valuation.minKurus;
  if (high <= 0) return { range: { minKurus: -high, maxKurus: -low }, customerReceives: true };
  return { range: { minKurus: Math.max(0, low), maxKurus: high }, customerReceives: false };
}

/** Farkın peşinatsız, en uzun vadeyle aylık taksiti (madde 38). */
export function differenceInstallments(difference: KurusRange, settings: FinanceSettings): { term: number; range: KurusRange } {
  const term = settings.terms.length ? Math.max(...settings.terms) : 12;
  const monthly = (kurus: number) => computePlan(kurus, 0, term, settings.monthlyRatePercent).monthlyPaymentKurus;
  return { term, range: { minKurus: monthly(difference.minKurus), maxKurus: monthly(difference.maxKurus) } };
}
