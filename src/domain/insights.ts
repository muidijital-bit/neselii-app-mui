import type { IsoDateTime } from './common';
import type { AdvisorId } from './ids';

/**
 * İlana yöneticinin girdiği ek bilgiler (form maddeleri 11, 12, 13):
 *  - Bakım ve kullanım geçmişi (11): önceki kullanım türü, sahip sayısı, son bakım tarihi/kilometresi, not.
 *  - Neşeli güven puanı (12): firmanın kontrol maddelerinden hesaplanır (karşılanan madde / toplam × 100).
 *  - Uzman görüşü (13): danışman adıyla "Güçlü yönler" ve "Dikkat edilecekler".
 */

export type TrustCheckKey = 'expertise' | 'maintenance' | 'noHeavyDamage' | 'inspection' | 'documents' | 'serviceRecords';

export const TRUST_CHECKS: readonly { readonly key: TrustCheckKey; readonly label: string }[] = [
  { key: 'expertise', label: 'Ekspertiz yapıldı' },
  { key: 'maintenance', label: 'Bakımları zamanında yapıldı' },
  { key: 'noHeavyDamage', label: 'Ağır hasar kaydı yok' },
  { key: 'inspection', label: 'Muayenesi geçerli' },
  { key: 'documents', label: 'Ruhsat ve belgeler tam' },
  { key: 'serviceRecords', label: 'Yetkili servis kayıtları var' },
];

export type TrustChecks = Readonly<Record<TrustCheckKey, boolean>>;

export const EMPTY_TRUST_CHECKS: TrustChecks = {
  expertise: false,
  maintenance: false,
  noHeavyDamage: false,
  inspection: false,
  documents: false,
  serviceRecords: false,
};

/** Önceki kullanım türü önerileri (serbest metin de kabul edilir). */
export const USAGE_TYPES: readonly string[] = ['Uzun yol', 'Şehir içi dağıtım', 'Şantiye', 'Tarım', 'Firma filosu'];

export type ListingInsights = {
  readonly usageType: string | null;
  readonly ownerCount: number | null;
  /** `YYYY-MM-DD`. */
  readonly lastServiceDate: string | null;
  readonly lastServiceKm: number | null;
  readonly historyNote: string | null;
  readonly checks: TrustChecks;
  readonly expert: { readonly id: AdvisorId; readonly fullName: string } | null;
  readonly strengths: readonly string[];
  readonly cautions: readonly string[];
  /** Madde 9: araç sağlık kartı. */
  readonly health: VehicleHealth;
  /** Madde 10: ekspertiz raporu PDF'inin herkese açık adresi; yüklenmediyse `null`. */
  readonly expertiseReportUrl: string | null;
  /** Depolamadaki yol (yönetici düzenlemesi için). */
  readonly expertiseReportPath: string | null;
  readonly updatedAt: IsoDateTime;
};

/** Madde 9: araç sağlık kartı (ekspertiz özeti, mekanik durum, lastik, muayene, bilinen kusurlar). */
export type VehicleHealth = {
  readonly expertiseSummary: string | null;
  readonly mechanicalCondition: string | null;
  /** Lastik diş durumu (%). */
  readonly tirePercent: number | null;
  /** `YYYY-MM-DD`. */
  readonly inspectionValidUntil: string | null;
  readonly knownDefects: readonly string[];
};

export const EMPTY_HEALTH: VehicleHealth = { expertiseSummary: null, mechanicalCondition: null, tirePercent: null, inspectionValidUntil: null, knownDefects: [] };

export const hasHealthCard = (i: ListingInsights) =>
  Boolean(i.health.expertiseSummary || i.health.mechanicalCondition || i.health.tirePercent !== null || i.health.inspectionValidUntil || i.health.knownDefects.length || i.expertiseReportUrl);

/** Yöneticinin kaydettiği alanlar (uzman yalnız kimlikle). */
export type ListingInsightsInput = Omit<ListingInsights, 'expert' | 'updatedAt' | 'expertiseReportUrl'> & { readonly expertId: AdvisorId | null };

/** Güven puanı 0–100 (karşılanan kontrol maddesi oranı, tam sayıya yuvarlanır). */
export function trustScore(checks: TrustChecks): number {
  const met = TRUST_CHECKS.filter(({ key }) => checks[key]).length;
  return Math.round((met / TRUST_CHECKS.length) * 100);
}

export const trustScoreLabel = (score: number) => (score >= 80 ? 'Çok iyi' : score >= 50 ? 'İyi' : 'Sınırlı bilgi');

export const hasHistory = (i: ListingInsights) =>
  Boolean(i.usageType || i.ownerCount !== null || i.lastServiceDate || i.lastServiceKm !== null || i.historyNote);

export const hasExpertOpinion = (i: ListingInsights) => i.strengths.length > 0 || i.cautions.length > 0;

export const hasAnyCheck = (i: ListingInsights) => TRUST_CHECKS.some(({ key }) => i.checks[key]);

/** Çok satırlı metin → madde listesi (boş satırlar atılır, en çok 10 madde, her madde en çok 160 karakter). */
export function linesToItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((line) => line.slice(0, 160));
}

/** `GG.AA.YYYY` → `YYYY-MM-DD`; geçersizse `null`. */
export function parseTrDate(text: string): string | null {
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` → `GG.AA.YYYY`. */
export function formatTrDate(key: string | null): string {
  const match = key ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(key) : null;
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}
