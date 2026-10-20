import type { IsoDateTime } from './common';
import { asAnnouncementId, asConversationId, asListingId, type AnnouncementId, type ConversationId, type ListingId, type NotificationId } from './ids';

/** Bildirim türleri (tasarım ekran 11 + akış diyagramı): yeni ilan, kayıtlı arama eşleşmesi, fiyat/durum değişikliği, mesaj cevabı, duyuru. */
/** `new-message`: yöneticiye müşteriden yeni mesaj. */
export type NotificationKind = 'new-listing' | 'saved-search-match' | 'price-change' | 'status-change' | 'message-reply' | 'new-message' | 'announcement';

/**
 * Dokunulunca nereye gidileceği. Tip güvenli: ilan bildirimi `ListingId`, mesaj bildirimi `ConversationId` taşır;
 * duyuru metnini içerir (uygulama içi açıklama). Geçersiz/bulunamayan hedef çökmemeli (015).
 */
export type NotificationTarget =
  | { readonly type: 'listing'; readonly listingId: ListingId }
  | { readonly type: 'conversation'; readonly conversationId: ConversationId }
  | { readonly type: 'announcement'; readonly announcementId: AnnouncementId; readonly title: string; readonly body: string };

export type NotificationTargetType = NotificationTarget['type'];

/** Rota segmenti olarak güvenli kimlik: harf/rakam ile başlar, `_` ve `-` içerebilir, en çok 64 karakter. Boşluk, `/`, `?`, `#` veya `..` taşıyamaz. */
const SAFE_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const isSafeEntityId = (value: unknown): value is string => typeof value === 'string' && SAFE_ENTITY_ID.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Dışarıdan gelen (derin bağlantı, ileride push yükü) ya da güvenilmeyen bir değeri tipli hedefe çevirir; geçersizse `null`.
 * Bilinmeyen tür, eksik/boş/güvenli olmayan kimlik ve dizi/sayı gibi yanlış tipler `null` verir — çağıran güvenli "ulaşılamıyor"
 * durumuna düşer, hiçbir yerde istisna fırlatılmaz. Duyuruda `title`/`body` yoksa boş metin alır (gösterilen metin her zaman servisten okunur).
 */
export function parseNotificationTarget(input: unknown): NotificationTarget | null {
  if (!isRecord(input)) return null;
  switch (input.type) {
    case 'listing':
      return isSafeEntityId(input.listingId) ? { type: 'listing', listingId: asListingId(input.listingId) } : null;
    case 'conversation':
      return isSafeEntityId(input.conversationId) ? { type: 'conversation', conversationId: asConversationId(input.conversationId) } : null;
    case 'announcement': {
      if (!isSafeEntityId(input.announcementId)) return null;
      const title = input.title === undefined ? '' : input.title;
      const body = input.body === undefined ? '' : input.body;
      if (typeof title !== 'string' || typeof body !== 'string') return null;
      return { type: 'announcement', announcementId: asAnnouncementId(input.announcementId), title, body };
    }
    default:
      return null;
  }
}

export type AppNotification = {
  readonly id: NotificationId;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly createdAt: IsoDateTime;
  readonly read: boolean;
  readonly target: NotificationTarget;
};

/**
 * Uygulama içi tercihler (Profil → Bildirim Tercihleri, tasarım ekran 12b). Sistem bildirim/konum izni cihazdaki
 * gerçek izin durumudur ve burada saklanmaz (018); reddedilmiş sistem izni "açık" gösterilmez.
 */
export type NotificationPreferences = {
  readonly newListings: boolean;
  readonly priceChanges: boolean;
  readonly statusChanges: boolean;
  readonly messageReplies: boolean;
  readonly announcements: boolean;
  /** "Yakındaki ilanları önce göster" (konum izni gerektirir; konum saklanmaz). */
  readonly nearbyFirst: boolean;
};

/** Tasarım ekran 12b'nin başlangıç durumu. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newListings: true,
  priceChanges: true,
  statusChanges: true,
  messageReplies: true,
  announcements: false,
  nearbyFirst: false,
};
