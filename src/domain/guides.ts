import type { IsoDateTime } from './common';
import type { SectorId } from './sectors';

/** Madde 46: sektörel içerik merkezi. Yönetici sektöre göre (ya da genel) rehber yazısı yayımlar; müşteri sektörüne göre okur. */
export type Guide = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** `null`: tüm sektörler için genel yazı. */
  readonly sector: SectorId | null;
  readonly published: boolean;
  readonly updatedAt: IsoDateTime;
};

export type GuideInput = { readonly title: string; readonly body: string; readonly sector: SectorId | null; readonly published: boolean };
