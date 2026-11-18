import type { IsoDateTime, Money } from './common';
import type { ApprovalStatus } from './companies';
import type { FinancePlan } from './finance';
import type { AdvisorId, LeadId, ListingId, UserId } from './ids';

/**
 * Talep (Beni arayın): müşteri ilan detayından bir konu, uygun gün ve saat aralığı seçip telefonunu bırakır. Sunucu talebe rastgele bir
 * danışman atar ("Danışmanınız sizi arayacaktır"); yönetici durumu ve danışmanı değiştirir. Finansman ve görüntülü inceleme ayrı modül
 * değil, aynı formun konu seçenekleridir.
 */
/** `inspection` / `expertise`: yerinde inceleme ve ekspertiz randevusu (madde 31, 15). */
export type LeadTopic =
  | 'info'
  | 'financing'
  | 'video_call'
  | 'inspection'
  | 'expertise'
  | 'insurance'
  | 'fleet_quote'
  | 'reservation'
  /** Adım 7: takas (madde 35) ve araç satın alma talebi (madde 40); takas formundan açılır. */
  | 'trade_in'
  | 'sell_vehicle';

export type LeadStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

/** Aranmak için uygun saat aralığı. */
export type LeadTimeSlot = 'morning' | 'noon' | 'afternoon' | 'any';

/** Talep formunda seçilebilen konular. `fleet_quote` (toplu teklif) karşılaştırma ekranından, `reservation` ilan detayından açılır. */
export const LEAD_TOPICS: readonly LeadTopic[] = ['info', 'financing', 'video_call', 'inspection', 'expertise', 'insurance', 'reservation'];
const ALL_LEAD_TOPICS: readonly LeadTopic[] = [...LEAD_TOPICS, 'fleet_quote', 'trade_in', 'sell_vehicle'];
/** Takas / araç alım talepleri (yönetici ayrı listede görür). */
export const TRADE_LEAD_TOPICS: readonly LeadTopic[] = ['trade_in', 'sell_vehicle'];
export const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];
export const LEAD_TIME_SLOTS: readonly LeadTimeSlot[] = ['any', 'morning', 'noon', 'afternoon'];

export const LEAD_TOPIC_LABELS: Record<LeadTopic, string> = {
  info: 'Bilgi almak istiyorum',
  financing: 'Finansman / kredi',
  video_call: 'Görüntülü inceleme',
  inspection: 'Yerinde inceleme randevusu',
  expertise: 'Ekspertiz randevusu',
  insurance: 'Sigorta / kasko teklifi',
  fleet_quote: 'Toplu (filo) teklif',
  reservation: 'Aracı rezerve etmek istiyorum',
  trade_in: 'Takas başvurusu',
  sell_vehicle: 'Aracımı satmak istiyorum',
};

/** Liste ve bildirimlerde kısa konu adı. */
export const LEAD_TOPIC_SHORT: Record<LeadTopic, string> = {
  info: 'Bilgi',
  financing: 'Finansman',
  video_call: 'Görüntülü inceleme',
  inspection: 'Yerinde inceleme',
  expertise: 'Ekspertiz',
  insurance: 'Sigorta / kasko',
  fleet_quote: 'Toplu teklif',
  reservation: 'Rezervasyon',
  trade_in: 'Takas',
  sell_vehicle: 'Araç satış',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Yeni',
  in_progress: 'Görüşülüyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

export const LEAD_TIME_SLOT_LABELS: Record<LeadTimeSlot, string> = {
  any: 'Fark etmez',
  morning: '09:00 – 12:00',
  noon: '12:00 – 15:00',
  afternoon: '15:00 – 18:00',
};

export const isLeadTopic = (value: unknown): value is LeadTopic => typeof value === 'string' && (ALL_LEAD_TOPICS as readonly string[]).includes(value);
export const isLeadStatus = (value: unknown): value is LeadStatus => typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
export const isLeadTimeSlot = (value: unknown): value is LeadTimeSlot =>
  typeof value === 'string' && (LEAD_TIME_SLOTS as readonly string[]).includes(value);

/** Talebe atanan danışman (müşteriye adı gösterilir). Yönetici Profil → Danışmanlar'dan ekler, düzenler, pasife alır veya siler. */
/** Madde 21: kurumsal finansman başvurusu (şirket adına). */
export type CorporateInfo = {
  readonly companyName: string;
  /** Şirketin kuruluş yılı. */
  readonly foundedYear: number | null;
  readonly activity: string | null;
  readonly revenueRange: RevenueRange | null;
  readonly vehicleCount: number | null;
  readonly plannedDownPaymentKurus: number | null;
};

export type RevenueRange = 'lt5m' | '5to20m' | '20to100m' | 'gt100m';

export const REVENUE_RANGES: readonly { readonly id: RevenueRange; readonly label: string }[] = [
  { id: 'lt5m', label: '5 milyon TL altı' },
  { id: '5to20m', label: '5 – 20 milyon TL' },
  { id: '20to100m', label: '20 – 100 milyon TL' },
  { id: 'gt100m', label: '100 milyon TL üzeri' },
];

export const isRevenueRange = (value: unknown): value is RevenueRange => REVENUE_RANGES.some((r) => r.id === value);

export type Advisor = { readonly id: AdvisorId; readonly fullName: string; readonly phone: string | null; readonly active: boolean };

/** Talebin bağlı olduğu ilanın kısa özeti; ilan silinmişse talepte `null`. */
export type LeadListing = {
  readonly id: ListingId;
  readonly title: string;
  readonly listingNumber: string;
  readonly price: Money;
  readonly coverImageUri: string | null;
};

export type Lead = {
  readonly id: LeadId;
  readonly topic: LeadTopic;
  readonly status: LeadStatus;
  /** `YYYY-MM-DD` (yerel gün); seçilmediyse `null`. */
  readonly preferredDate: string | null;
  readonly preferredSlot: LeadTimeSlot;
  readonly contactPhone: string;
  readonly note: string | null;
  /** Hesaplayıcıdan gelen ödeme planı; yoksa `null`. */
  readonly plan: FinancePlan | null;
  /** Madde 47/51: şirket adına açılan talep (şirket adı) ve onay durumu. */
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly approvalStatus: ApprovalStatus;
  /** Madde 21: kurumsal finansman başvurusu bilgileri; bireyselse `null`. */
  readonly corporate: CorporateInfo | null;
  /** Madde 44: toplu teklifteki ilanlar (karşılaştırma listesinden). */
  readonly fleetListings: readonly LeadListing[];
  /** Madde 33: onaylanmış rezervasyonun bitişi (ilan şu an bu talep için rezerve ise); yoksa `null`. */
  readonly reservedUntil: IsoDateTime | null;
  readonly advisor: Advisor | null;
  /** Yöneticinin atadığı randevu (madde 31); yoksa `null`. */
  readonly appointmentAt: IsoDateTime | null;
  /** Randevu yeri (madde 39; ör. "Firmamızda"). */
  readonly appointmentLocation: string | null;
  readonly listing: LeadListing | null;
  /** Talebi bırakan müşteri (yönetici görünümü için; müşteri kendi talebinde de kendini görür). */
  readonly customer: { readonly id: UserId; readonly fullName: string };
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
};

/** Önümüzdeki `count` günü `YYYY-MM-DD` olarak verir (bugün dahil, cihazın yerel saatine göre). */
export function upcomingDays(count: number, now: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    days.push(toLocalDateKey(day));
  }
  return days;
}

export function toLocalDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Türk telefon numarası için gevşek denetim: rakamları sayar (boşluk, tire, parantez, + serbest). */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}
