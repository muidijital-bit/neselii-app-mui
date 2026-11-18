import type { IsoDateTime } from './common';
import type { ListingSummary } from './listing';
import type { SectorId } from './sectors';

/** Madde 45: projeye göre araç paketi (ör. "Şantiye paketi"). Yönetici ilanlardan paket oluşturur; müşteri paket için tek teklif ister. */
export type VehiclePackage = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly sector: SectorId | null;
  readonly published: boolean;
  /** Paketteki ilanlar (yalnız görünür olanlar), sıralı. */
  readonly listings: readonly ListingSummary[];
  readonly totalPriceKurus: number;
  readonly updatedAt: IsoDateTime;
};

export type VehiclePackageInput = {
  readonly title: string;
  readonly description: string | null;
  readonly sector: SectorId | null;
  readonly published: boolean;
  readonly listingIds: readonly string[];
};

/** Paketteki en çok ilan (tek toplu teklif talebine sığar). */
export const MAX_PACKAGE_LISTINGS = 10;
