import type { Href } from 'expo-router';

/**
 * Profil menüsü hedefleri: Profil düzenleme (016), Favori İlanlarım / Kayıtlı Aramalarım (017), Bildirim Tercihleri (018), Gizlilik ve Güvenlik
 * ile Hesabımı Sil (019) gerçek ekranlardır. Menü tek yerden — `PROFILE_TARGETS` — bağlıdır.
 */
export const EDIT_PROFILE_HREF: Href = '/edit-profile';

type MenuTarget = { readonly href: Href; readonly title: string };

export const PROFILE_TARGETS = {
  favorites: { href: '/favorites', title: 'Favori İlanlarım' },
  savedSearches: { href: '/saved-searches', title: 'Kayıtlı Aramalarım' },
  notificationPreferences: { href: '/notification-preferences', title: 'Bildirim Tercihleri' },
  privacy: { href: '/privacy', title: 'Gizlilik ve Güvenlik' },
  deleteAccount: { href: '/delete-account', title: 'Hesabımı Sil' },
} as const satisfies Record<string, MenuTarget>;
