import { LEAD_STATUS_LABELS, LEAD_TIME_SLOT_LABELS, toLocalDateKey, type Lead, type LeadStatus, type LeadTopic } from '@/domain';
import type { IconName } from '@/ui/Icon';

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const LEAD_STATUS_TONES: Record<LeadStatus, BadgeTone> = {
  new: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export const LEAD_TOPIC_ICONS: Record<LeadTopic, IconName> = {
  info: 'info',
  financing: 'credit-card',
  video_call: 'video',
};

export const leadStatusLabel = (status: LeadStatus) => LEAD_STATUS_LABELS[status];

const WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** `YYYY-MM-DD` → yerel tarih (saat dilimi kaymasın diye parçalardan kurulur). */
function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Gün çipi etiketi: "Bugün", "Yarın" ya da "Cum 21 Kas". */
export function dayLabel(key: string, now: Date = new Date()): string {
  const date = parseDateKey(key);
  if (!date) return key;
  const today = toLocalDateKey(now);
  const tomorrow = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (key === today) return 'Bugün';
  if (key === tomorrow) return 'Yarın';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Yarın, 09:00 – 12:00" / "Fark etmez" — talebin aranma zamanı. */
export function leadWhen(lead: Pick<Lead, 'preferredDate' | 'preferredSlot'>, now: Date = new Date()): string {
  const day = lead.preferredDate ? dayLabel(lead.preferredDate, now) : null;
  const slot = lead.preferredSlot === 'any' ? null : LEAD_TIME_SLOT_LABELS[lead.preferredSlot];
  if (day && slot) return `${day}, ${slot}`;
  return day ?? slot ?? 'Uygun olduğunuz bir zamanda';
}

/** Talep oluşturulma tarihi: "18 Kas 2026, 14:05". */
export function formatLeadDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Telefon bağlantısı için yalnızca rakam ve baştaki `+`. */
export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
