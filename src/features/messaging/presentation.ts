import { formatRelativeDate, type Conversation } from '@/domain';

export type ConversationRowModel = {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly timeLabel: string;
  readonly unreadCount: number;
  readonly unreadLabel: string;
  readonly imageUri?: string;
};

/** Türkiye kalıcı olarak UTC+3'tür (bkz. `formatRelativeDate`); saat ve gün cihaz saat dilimine değil Türkiye'ye göre. */
const TURKEY_OFFSET_MS = 3 * 3_600_000;
const DAY_MS = 86_400_000;

const turkeyDay = (ms: number) => Math.floor((ms + TURKEY_OFFSET_MS) / DAY_MS);

/** `HH:mm` (Türkiye saati). */
export function formatClock(iso: string): string {
  const date = new Date(Date.parse(iso) + TURKEY_OFFSET_MS);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

/** Bugünün mesajı saatle (`14:15`), daha eskisi ilan tarihiyle aynı göreli biçimde (`Dün`, `2 gün önce`, `12 Eki`) gösterilir. */
export function conversationTime(iso: string, nowMs: number): string {
  const thenMs = Date.parse(iso);
  if (!Number.isFinite(thenMs)) return '';
  return turkeyDay(nowMs) - turkeyDay(thenMs) <= 0 ? formatClock(iso) : formatRelativeDate(iso, nowMs);
}

/** 99'dan büyük sayaç `99+` görünür (rozet taşmaz); erişilebilir etikette gerçek sayı kullanılır. */
export const unreadBadgeText = (count: number) => (count > 99 ? '99+' : String(count));

/** Satır önizlemesi: kullanıcının kendi mesajı `Siz: …` ile başlar; sohbet henüz boşsa açıklayıcı metin. */
export function previewText(conversation: Pick<Conversation, 'lastMessage'>): string {
  const last = conversation.lastMessage;
  if (!last) return 'Görüşme başlatıldı';
  return last.sender === 'user' ? `Siz: ${last.text}` : last.text;
}

export function toConversationRow(conversation: Conversation, nowMs: number): ConversationRowModel {
  return {
    id: conversation.id,
    title: conversation.listing.title,
    preview: previewText(conversation),
    timeLabel: conversationTime(conversation.lastMessage?.sentAt ?? conversation.updatedAt, nowMs),
    unreadCount: conversation.unreadCount,
    unreadLabel: unreadBadgeText(conversation.unreadCount),
    imageUri: conversation.listing.coverImageUri ?? undefined,
  };
}
