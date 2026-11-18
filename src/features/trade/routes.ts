import type { Href } from 'expo-router';

import type { TradeInKind } from '@/domain';

/** Adım 7: takas / araç satış formu. İlan verilirse takas farkı o ilana göre hesaplanır. */
export const tradeInHref = (options: { listingId?: string; kind?: TradeInKind } = {}): Href => ({
  pathname: '/trade-in',
  params: { ...(options.listingId ? { listingId: options.listingId } : {}), ...(options.kind ? { kind: options.kind } : {}) },
});

/** Yönetici: takas ve araç alım talepleri (madde 40: ayrı liste). */
export const TRADE_LEADS_HREF: Href = { pathname: '/leads', params: { group: 'trade' } };
