import { formatRelativeDate, type AppNotification, type NotificationKind } from '@/domain';
import type { IconName } from '@/components/icons/Icon';
import { colors } from '@/theme';

export type NotificationRowModel = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly unread: boolean;
  readonly icon: IconName;
  readonly iconBackground: string;
  readonly iconColor: string;
  readonly target: AppNotification['target'];
};

/** Tür → simge ve renk çifti (tasarım ekran 11: etiket zemini + simge rengi). */
const KIND_STYLE: Record<NotificationKind, { icon: IconName; background: string; color: string }> = {
  'new-listing': { icon: 'tag', background: colors.greenTint, color: colors.greenPressed },
  'saved-search-match': { icon: 'tag', background: colors.greenTint, color: colors.greenPressed },
  'message-reply': { icon: 'message-circle', background: colors.bluePale, color: colors.blue },
  'new-message': { icon: 'message-circle', background: colors.greenTint, color: colors.greenPressed },
  'price-change': { icon: 'trending-down', background: colors.warningTint, color: colors.warningText },
  'status-change': { icon: 'refresh-cw', background: colors.lineSoft, color: colors.inkMuted },
  announcement: { icon: 'megaphone', background: colors.blueTint, color: colors.blueText },
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** `Az önce`, `12 dk önce`, `2 sa önce` (24 saate kadar); sonrası ilan tarihiyle aynı göreli biçim (`Dün`, `4 gün önce`, `12 Eki`). */
export function notificationTime(iso: string, nowMs: number): string {
  const thenMs = Date.parse(iso);
  if (!Number.isFinite(thenMs)) return '';
  const elapsed = nowMs - thenMs;
  if (elapsed < MINUTE_MS) return 'Az önce';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} dk önce`;
  if (elapsed < 24 * HOUR_MS) return `${Math.floor(elapsed / HOUR_MS)} sa önce`;
  return formatRelativeDate(iso, nowMs);
}

export function toNotificationRow(notification: AppNotification, nowMs: number): NotificationRowModel {
  const style = KIND_STYLE[notification.kind];
  const time = notificationTime(notification.createdAt, nowMs);
  return {
    id: notification.id,
    title: notification.title,
    subtitle: time === '' ? notification.body : `${notification.body} · ${time}`,
    unread: !notification.read,
    icon: style.icon,
    iconBackground: style.background,
    iconColor: style.color,
    target: notification.target,
  };
}

/** 99'dan büyük sayaç `99+` görünür (rozet taşmaz). */
export const unreadBadgeText = (count: number) => (count > 99 ? '99+' : String(count));
