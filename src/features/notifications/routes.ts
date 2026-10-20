import type { Href } from 'expo-router';

/**
 * Bildirim rotaları (015):
 *  - duyuru: `/announcements/<announcementId>` — yalnızca kimlik taşır; metin her zaman servisten (hesaba süzülmüş bildirim listesi) okunur.
 *  - ulaşılamayan hedef: `/notification-unavailable` — geçersiz/bozuk bir hedefin güvenli durumu (çökme yok).
 *  - dış bağlantı girişi: `/notification-target?type=<listing|conversation|announcement>&id=<kimlik>` — uygulama şeması
 *    (`neseli://notification-target?...`) ve ileride gerçek push dokunuşu aynı girişi kullanır.
 */
export const announcementHref = (announcementId: string): Href => ({ pathname: '/announcements/[announcementId]', params: { announcementId } });

export const NOTIFICATION_UNAVAILABLE_HREF: Href = '/notification-unavailable';

export const NOTIFICATION_LINK_PATH = '/notification-target';
