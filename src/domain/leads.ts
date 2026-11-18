import type { IsoDateTime, Money } from './common';
import type { FinancePlan } from './finance';
import type { AdvisorId, LeadId, ListingId, UserId } from './ids';

/**
 * Talep (Beni arayın): müşteri ilan detayından bir konu, uygun gün ve saat aralığı seçip telefonunu bırakır. Sunucu talebe rastgele bir
 * danışman atar ("Danışmanınız sizi arayacaktır"); yönetici durumu ve danışmanı değiştirir. Finansman ve görüntülü inceleme ayrı modül
 * değil, aynı formun konu seçenekleridir.
 */
export type LeadTopic = 'info' | 'financing' | 'video_call';

export type LeadStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

/** Aranmak için uygun saat aralığı. */
export type LeadTimeSlot = 'morning' | 'noon' | 'afternoon' | 'any';

export const LEAD_TOPICS: readonly LeadTopic[] = ['info', 'financing', 'video_call'];
export const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];
export const LEAD_TIME_SLOTS: readonly LeadTimeSlot[] = ['any', 'morning', 'noon', 'afternoon'];

export const LEAD_TOPIC_LABELS: Record<LeadTopic, string> = {
  info: 'Bilgi almak istiyorum',
  financing: 'Finansman / kredi',
  video_call: 'Görüntülü inceleme',
};

/** Liste ve bildirimlerde kısa konu adı. */
export const LEAD_TOPIC_SHORT: Record<LeadTopic, string> = {
  info: 'Bilgi',
  financing: 'Finansman',
  video_call: 'Görüntülü inceleme',
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

export const isLeadTopic = (value: unknown): value is LeadTopic => typeof value === 'string' && (LEAD_TOPICS as readonly string[]).includes(value);
export const isLeadStatus = (value: unknown): value is LeadStatus => typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
export const isLeadTimeSlot = (value: unknown): value is LeadTimeSlot =>
  typeof value === 'string' && (LEAD_TIME_SLOTS as readonly string[]).includes(value);

/** Talebe atanan danışman (müşteriye adı gösterilir). Yönetici Profil → Danışmanlar'dan ekler, düzenler, pasife alır veya siler. */
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
  readonly advisor: Advisor | null;
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
