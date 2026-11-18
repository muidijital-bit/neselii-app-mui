/**
 * Aylık ödeme hesabı (eşit taksitli kredi / anüite). Faiz oranını firma belirler (Profil → Finansman Ayarları); sonuç tahminidir, banka
 * teklifi değildir. Tutarlar tam sayı kuruş olarak tutulur.
 */

/** Madde 24: toplam sahip olma maliyeti için firmanın varsayılan değerleri. */
export type CostSettings = {
  /** Motorin fiyatı (TL / litre). */
  readonly fuelPriceTl: number;
  /** Kategoriye göre ortalama tüketim (litre / 100 km); kategori kimliği → değer. */
  readonly fuelConsumption: Readonly<Record<string, number>>;
  readonly maintenanceTlPerKm: number;
  readonly tireTlPerKm: number;
  readonly insuranceTlPerYear: number;
  readonly taxTlPerYear: number;
};

export const DEFAULT_COST_SETTINGS: CostSettings = {
  fuelPriceTl: 55,
  fuelConsumption: { kamyon: 28, cekici: 32, 'ticari-arac': 11, dorse: 0 },
  maintenanceTlPerKm: 2.5,
  tireTlPerKm: 1.2,
  insuranceTlPerYear: 75000,
  taxTlPerYear: 25000,
};

export type FinanceSettings = {
  /** Aylık faiz yüzdesi (ör. 2,99). Vergiler dahil düşünülür. */
  readonly monthlyRatePercent: number;
  /** En düşük peşinat oranı (fiyatın yüzdesi). */
  readonly minDownPaymentPercent: number;
  /** Sunulan vadeler (ay), küçükten büyüğe. */
  readonly terms: readonly number[];
  /** Toplam sahip olma maliyeti varsayılanları (madde 24). */
  readonly costs: CostSettings;
};

/** Yöneticinin seçebileceği vadeler (sunucu kısıtıyla aynı). */
export const AVAILABLE_TERMS: readonly number[] = [6, 12, 18, 24, 36, 48, 60];

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = { monthlyRatePercent: 2.99, minDownPaymentPercent: 30, terms: [12, 24, 36], costs: DEFAULT_COST_SETTINGS };

/** Talebe eklenen ödeme planı (hesaplayıcının "Bu planla beni arayın" eylemi). */
export type FinancePlan = {
  readonly priceKurus: number;
  readonly downPaymentKurus: number;
  readonly termMonths: number;
  readonly monthlyRatePercent: number;
  readonly creditKurus: number;
  readonly monthlyPaymentKurus: number;
  readonly totalPaymentKurus: number;
};

/** `principal` kuruşluk kredinin aylık taksiti. Faiz 0 ise eşit bölünür. */
export function monthlyPayment(principalKurus: number, monthlyRatePercent: number, termMonths: number): number {
  if (principalKurus <= 0 || termMonths <= 0) return 0;
  const r = monthlyRatePercent / 100;
  if (r === 0) return Math.round(principalKurus / termMonths);
  return Math.round((principalKurus * r) / (1 - Math.pow(1 + r, -termMonths)));
}

/** Fiyat, peşinat ve vadeye göre plan. Peşinat fiyatı aşarsa fiyata eşitlenir (kredi 0). */
export function computePlan(priceKurus: number, downPaymentKurus: number, termMonths: number, monthlyRatePercent: number): FinancePlan {
  const down = Math.min(Math.max(0, Math.round(downPaymentKurus)), priceKurus);
  const credit = priceKurus - down;
  const monthly = monthlyPayment(credit, monthlyRatePercent, termMonths);
  return {
    priceKurus,
    downPaymentKurus: down,
    termMonths,
    monthlyRatePercent,
    creditKurus: credit,
    monthlyPaymentKurus: monthly,
    totalPaymentKurus: down + monthly * termMonths,
  };
}

/**
 * Aylık bütçe + peşinatla alınabilecek en yüksek araç fiyatı: kredinin bugünkü değeri + peşinat. Peşinat en düşük oranın altında kalmasın diye
 * fiyat ayrıca `peşinat / en düşük oran` ile sınırlanır (oran 0 ise sınır yok).
 */
export function maxPriceForBudget(monthlyKurus: number, downPaymentKurus: number, termMonths: number, settings: FinanceSettings): number {
  if (monthlyKurus <= 0 && downPaymentKurus <= 0) return 0;
  const r = settings.monthlyRatePercent / 100;
  const credit = r === 0 ? monthlyKurus * termMonths : (monthlyKurus * (1 - Math.pow(1 + r, -termMonths))) / r;
  let price = downPaymentKurus + credit;
  if (settings.minDownPaymentPercent > 0) price = Math.min(price, downPaymentKurus / (settings.minDownPaymentPercent / 100));
  return Math.max(0, Math.floor(price));
}

/** Peşinat oranı seçenekleri: en düşük orandan başlayıp 10'ar artan, en çok 4 seçenek (ör. %30, %40, %50, %60). */
export function downPaymentOptions(settings: FinanceSettings): number[] {
  const start = Math.max(0, Math.min(90, settings.minDownPaymentPercent));
  const options: number[] = [];
  for (let p = start; p <= 90 && options.length < 4; p += 10) options.push(p);
  return options;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonNegativeInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Güvenilmeyen değeri (rota parametresi, talep `data` alanı) plana çevirir; tutarsızsa `null`. */
export function parseFinancePlan(input: unknown): FinancePlan | null {
  if (!isRecord(input)) return null;
  const { priceKurus, downPaymentKurus, termMonths, monthlyRatePercent } = input;
  if (!isNonNegativeInt(priceKurus) || !isNonNegativeInt(downPaymentKurus) || !isNonNegativeInt(termMonths) || termMonths === 0) return null;
  if (typeof monthlyRatePercent !== 'number' || !Number.isFinite(monthlyRatePercent) || monthlyRatePercent < 0 || monthlyRatePercent > 20) return null;
  if (downPaymentKurus > priceKurus || termMonths > 120) return null;
  return computePlan(priceKurus, downPaymentKurus, termMonths, monthlyRatePercent);
}

/** "%2,99" gösterimi. */
export const formatRatePercent = (value: number) => `%${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- Toplam sahip olma maliyeti (madde 24) ---------------------------------------------------------------------------

export type OwnershipInput = {
  readonly priceKurus: number;
  readonly annualKm: number;
  /** Litre / 100 km. */
  readonly consumption: number;
  /** Kredili alımda ilk yılın taksitleri maliyete eklenir (en düşük peşinat, en uzun vade). */
  readonly financed: boolean;
};

export type OwnershipLine = { readonly key: 'fuel' | 'maintenance' | 'tire' | 'insurance' | 'tax' | 'installment'; readonly label: string; readonly yearlyKurus: number };

export type OwnershipCost = {
  readonly lines: readonly OwnershipLine[];
  readonly yearlyKurus: number;
  readonly monthlyKurus: number;
  /** Km başına işletme maliyeti (taksit hariç). */
  readonly perKmKurus: number;
  readonly plan: FinancePlan | null;
};

const tlK = (tl: number) => Math.round(tl * 100);

/** Yıllık ve aylık sahip olma maliyeti: yakıt, bakım, lastik, sigorta, vergi (+ kredili alımda taksitler). */
export function ownershipCost(input: OwnershipInput, settings: FinanceSettings): OwnershipCost {
  const { costs } = settings;
  const km = Math.max(0, input.annualKm);
  const fuel = tlK((km / 100) * Math.max(0, input.consumption) * costs.fuelPriceTl);
  const maintenance = tlK(km * costs.maintenanceTlPerKm);
  const tire = tlK(km * costs.tireTlPerKm);
  const insurance = tlK(costs.insuranceTlPerYear);
  const tax = tlK(costs.taxTlPerYear);
  const term = settings.terms.length ? Math.max(...settings.terms) : 12;
  const plan = input.financed
    ? computePlan(input.priceKurus, Math.round((input.priceKurus * settings.minDownPaymentPercent) / 100), term, settings.monthlyRatePercent)
    : null;
  const installment = plan ? plan.monthlyPaymentKurus * Math.min(12, plan.termMonths) : 0;
  const lines: OwnershipLine[] = [
    { key: 'fuel', label: 'Yakıt', yearlyKurus: fuel },
    { key: 'maintenance', label: 'Bakım', yearlyKurus: maintenance },
    { key: 'tire', label: 'Lastik', yearlyKurus: tire },
    { key: 'insurance', label: 'Sigorta / kasko', yearlyKurus: insurance },
    { key: 'tax', label: 'Vergi (MTV)', yearlyKurus: tax },
    ...(plan ? [{ key: 'installment' as const, label: 'Kredi taksitleri (ilk yıl)', yearlyKurus: installment }] : []),
  ];
  const yearly = lines.reduce((sum, line) => sum + line.yearlyKurus, 0);
  const operating = fuel + maintenance + tire + insurance + tax;
  return { lines, yearlyKurus: yearly, monthlyKurus: Math.round(yearly / 12), perKmKurus: km > 0 ? Math.round(operating / km) : 0, plan };
}
