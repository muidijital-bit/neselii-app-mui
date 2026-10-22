import type { IconName } from '@/ui/Icon';
import type { ListingStatus } from '@/ui/format';

/**
 * Kart / karo / vitrin bileşenlerinin gösterdiği ilan alanları. Bileşenler veri katmanını tanımaz; ekranlar domain ilanını
 * `features/listings/presentation` içindeki `toListingView` ile bu biçime çevirir.
 */
export type ListingView = {
  readonly id: string;
  readonly title: string;
  readonly coverUri: string | null;
  readonly categoryName: string;
  /** Fotoğraf yokken yer tutucuda gösterilen kategori ikonu. */
  readonly categoryIcon: IconName;
  readonly subtype: string | null;
  readonly status: ListingStatus;
  readonly year: number | null;
  readonly km: number | null;
  readonly city: string;
  /** TL cinsinden tam sayı fiyat. */
  readonly price: number;
  readonly financing: string | null;
  readonly publishedAt: string | null;
  readonly photoCount: number;
  readonly hasVideo: boolean;
};
