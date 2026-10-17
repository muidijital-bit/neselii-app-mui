import type { ListingStatus } from '@/types/database';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

/** 2850000 -> "2.850.000 TL" */
export function formatPrice(price: number, currency = 'TRY') {
  return `${numberFormatter.format(price)} ${currency === 'TRY' ? 'TL' : currency}`;
}

export function formatKm(km: number) {
  return `${numberFormatter.format(km)} km`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** "Mart 2026" */
export function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

/** "az önce", "5 dakika önce", "3 saat önce", "dün", "2 gün önce", "1 hafta önce", "3 ay önce" */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

/** Son 7 gün içinde yayımlanan ilanlar "Yeni" rozeti alır. */
export function isNewListing(publishedAt: string | null) {
  return !!publishedAt && Date.now() - new Date(publishedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export const statusLabels: Record<ListingStatus, string> = {
  draft: 'Taslak',
  published: 'Yayında',
  reserved: 'Rezerve',
  sold: 'Satıldı',
  unpublished: 'Yayından kalktı',
};

export const statusTones = {
  draft: 'neutral',
  published: 'success',
  reserved: 'warning',
  sold: 'danger',
  unpublished: 'neutral',
} as const satisfies Record<ListingStatus, string>;

export function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('');
}
