import type { Href } from 'expo-router';

/** Talepler: müşteride "Taleplerim", yöneticide firma gelen kutusu ("Talepler"). */
export const LEADS_HREF: Href = '/leads';

export const leadHref = (leadId: string): Href => ({ pathname: '/leads/[leadId]', params: { leadId } });

/** Yönetici: randevu takvimi (madde 31). */
export const APPOINTMENTS_HREF: Href = '/appointments';

/** İlan detayındaki "Beni Arayın" formu. */
export const leadRequestHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/request', params: { listingId } });

/** Madde 33: rezervasyon talebi (konu sabit). */
export const reservationRequestHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/request', params: { listingId, topic: 'reservation' } });

/** Madde 44: karşılaştırma listesindeki ilanlar için toplu teklif. */
export const fleetQuoteHref = (listingIds: readonly string[]): Href => ({
  pathname: '/listings/[listingId]/request',
  params: { listingId: listingIds[0] ?? '', topic: 'fleet_quote', fleet: listingIds.join(',') },
});

/** Madde 16: satın alma için gerekli belgeler. */
export const DOCUMENTS_HREF: Href = '/documents';
