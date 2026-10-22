import type { AppNotification, NotificationKind } from '@/domain';
import type { IconName } from '@/ui/Icon';
import { timeAgo } from '@/ui/format';
import { Colors } from '@/ui/theme';

export type NotificationRowModel = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly unread: boolean;
  readonly icon: IconName;
  readonly iconBackground: string;
  readonly iconColor: string;
  /** İlanın kapak fotoğrafı; varsa satırda tür simgesi yerine fotoğraf, simge köşesinde küçük rozet olarak durur. */
  readonly imageUri: string | null;
  readonly target: AppNotification['target'];
};

/**
 * Tür → simge ve renk çifti (main tasarımındaki `typeStyles`). Main'de olmayan türler aynı dile oturtuldu: kayıtlı arama eşleşmesi yeni ilanla
 * aynı; `new-message` (yöneticiye müşteriden yeni mesaj) yeşil zeminli mesaj balonu (mesaj cevabının lacivert balonundan ayrışır).
 */
const KIND_STYLE: Record<NotificationKind, { icon: IconName; background: string; color: string }> = {
  'new-listing': { icon: 'tag', background: '#E2F5E9', color: Colors.green },
  'saved-search-match': { icon: 'tag', background: '#E2F5E9', color: Colors.green },
  'message-reply': { icon: 'message-circle', background: '#DCE6F2', color: Colors.heading },
  'new-message': { icon: 'message-square', background: '#E2F5E9', color: Colors.green },
  'price-change': { icon: 'trending-down', background: Colors.warningSoft, color: Colors.warning },
  'status-change': { icon: 'refresh-cw', background: Colors.chip, color: Colors.textSecondary },
  announcement: { icon: 'mci:bullhorn-outline', background: Colors.surfaceMuted, color: Colors.heading },
};

/** Main'deki göreli zaman: `az önce`, `5 dakika önce`, `3 saat önce`, `dün`, `2 gün önce`… Geçersiz tarih boş metin verir. */
export function notificationTime(iso: string, nowMs: number): string {
  return Number.isFinite(Date.parse(iso)) ? timeAgo(iso, nowMs) : '';
}

export function toNotificationRow(notification: AppNotification, nowMs: number): NotificationRowModel {
  const style = KIND_STYLE[notification.kind];
  const time = notificationTime(notification.createdAt, nowMs);
  return {
    id: notification.id,
    title: notification.title,
    subtitle: [notification.body, time].filter(Boolean).join(' · '),
    unread: !notification.read,
    icon: style.icon,
    iconBackground: style.background,
    iconColor: style.color,
    imageUri: notification.imageUri,
    target: notification.target,
  };
}

/** 99'dan büyük sayaç `99+` görünür (rozet taşmaz). */
export const unreadBadgeText = (count: number) => (count > 99 ? '99+' : String(count));
