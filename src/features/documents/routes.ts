import type { Href } from 'expo-router';

/** Müşteri: Belgelerim (madde 52). */
export const MY_DOCUMENTS_HREF: Href = '/my-documents';

/** Yönetici: talep için PDF teklif oluştur (madde 32). */
export const quoteHref = (leadId: string): Href => ({ pathname: '/leads/[leadId]/quote', params: { leadId } });
