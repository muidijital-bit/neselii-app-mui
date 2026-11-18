import type { Href } from 'expo-router';

/** Talepler: müşteride "Taleplerim", yöneticide firma gelen kutusu ("Talepler"). */
export const LEADS_HREF: Href = '/leads';

export const leadHref = (leadId: string): Href => ({ pathname: '/leads/[leadId]', params: { leadId } });

/** Yönetici: randevu takvimi (madde 31). */
export const APPOINTMENTS_HREF: Href = '/appointments';

/** İlan detayındaki "Beni Arayın" formu. */
export const leadRequestHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/request', params: { listingId } });
