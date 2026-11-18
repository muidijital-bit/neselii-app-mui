import type { IsoDateTime } from './common';
import type { ListingId } from './ids';

/** Madde 27: "Hemen Ara" kaydı. Yönetici hangi ilanın kaç kez arandığını ve son aramaları görür. */
export type CallLog = {
  readonly id: string;
  /** Genel arama (ilan dışı) için `null`; ilan silinmişse de `null`. */
  readonly listing: { readonly id: ListingId; readonly title: string } | null;
  readonly customer: { readonly fullName: string; readonly phone: string | null };
  readonly createdAt: IsoDateTime;
};

export type CallStats = { readonly total: number; readonly last30Days: number };

export type CallSummary = { readonly today: number; readonly last7Days: number; readonly total: number };
