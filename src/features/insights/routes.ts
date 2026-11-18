import type { Href } from 'expo-router';

/** Yönetici: ilanın geçmiş / güven / uzman görüşü düzenleme ekranı (madde 11–13). */
export const listingInsightsHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/insights', params: { listingId } });
