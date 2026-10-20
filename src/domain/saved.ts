import type { IsoDateTime } from './common';
import type { ListingId, SavedSearchId } from './ids';
import type { ListingSearch } from './filters';
import type { ListingSummary } from './listing';

/** Favori kaydı. İlan sonradan kalkarsa/silinirse `listing === null` döner; ekran bunu güvenle gösterir (017). */
export type FavoriteEntry = {
  readonly listingId: ListingId;
  readonly addedAt: IsoDateTime;
  readonly listing: ListingSummary | null;
};

/** Kayıtlı arama: aynı metin + filtre + sırayla yeniden açılır. */
export type SavedSearch = {
  readonly id: SavedSearchId;
  /** Kullanıcıya gösterilen ad (ör. `Mercedes-Benz · 2018+ · Çekici`). */
  readonly title: string;
  readonly search: ListingSearch;
  readonly createdAt: IsoDateTime;
};
