import type { CategoryId } from './categories';
import type { IsoDateTime, Money } from './common';
import type { ListingId, MediaId } from './ids';

/**
 * İlan yaşam döngüsü (PRODUCT.md): satılmış ilan görüntülenebilir; yayından kalkmış ilan açıklamalı durumla gösterilir;
 * hiç var olmayan ilan `notFound` hatasıdır.
 */
export type ListingStatus = 'published' | 'reserved' | 'sold' | 'withdrawn';

/** Aramada süzülebilen durumlar (tasarım filtresi: Yayında / Rezerve / Satıldı). Yayından kalkmış ilan aranmaz. */
export type SearchableStatus = Exclude<ListingStatus, 'withdrawn'>;

export type Coordinates = { readonly latitude: number; readonly longitude: number };

export type ListingLocation = {
  readonly city: string;
  readonly district: string;
  /**
   * Yakınlık sıralaması cihazda hesaplanır (018); kullanıcının konumu backend'e gönderilmez. İlan koordinatları burada durur.
   * Yoksa ilan yakınlık sıralamasında sona düşer.
   */
  readonly coordinates?: Coordinates;
};

export type ListingSummary = {
  readonly id: ListingId;
  /** Kullanıcıya gösterilen ilan numarası (`İlan no: 1024518`). Kimlik değil, gösterim alanıdır. */
  readonly listingNumber: string;
  readonly title: string;
  readonly categoryId: CategoryId;
  /** Alt tür (`4x2 Çekici`); kategori kataloğundaki alt türlerden biri. */
  readonly subcategory?: string;
  readonly price: Money;
  readonly location: ListingLocation;
  readonly publishedAt: IsoDateTime;
  readonly status: ListingStatus;
  /** "Yeni" rozeti. Ölçütü servis belirler (tasarım bir gün eşiği vermez). */
  readonly isNew: boolean;
  readonly photoCount: number;
  readonly hasVideo: boolean;
  /** Kapak görseli; yoksa `null` (tasarımdaki şeritli yer tutucu gösterilir). */
  readonly coverImageUri: string | null;
  /** Finansman seçeneği (`Kredi kartına 18 ay taksit`, `%2,85 faizli kredi`); yoksa `null`. */
  readonly financing: string | null;
  /** Firma tarafından öne çıkarılmış ilan (ana sayfa "Öne Çıkan İlanlar"). */
  readonly isFeatured: boolean;
  /** Kart meta satırı için (`2024 · 10.000 km`); kategoriye göre boş olabilir. */
  readonly modelYear?: number;
  readonly odometerKm?: number;
};

export type MediaItem = {
  readonly id: MediaId;
  readonly kind: 'photo' | 'video';
  /** Adres yoksa `null`: yer tutucu çizilir. */
  readonly uri: string | null;
  readonly thumbnailUri?: string | null;
  readonly durationSeconds?: number;
};

export type DriveConfig = '4x2' | '6x2' | '6x4';
export type TrailerAxles = 2 | 3 | 4;
/** Tasarım filtresindeki oda seçenekleri. */
export type RoomCount = '1+1' | '2+1' | '3+1' | '4+1';
export type FuelType = 'diesel' | 'petrol' | 'lpg' | 'electric' | 'hybrid';
export type Gearbox = 'manual' | 'automatic' | 'semi-automatic';
export type DamageStatus = 'none' | 'repaired' | 'damaged';

/** Özellik tablosu (`Özellikler`): kategori grubuna göre ayrışır. Tasarımdaki satırlar: Marka, Model, Model Yılı, Kilometre, Yakıt, Vites, Kasa Tipi, Hasar Durumu. */
export type ListingSpecs =
  | {
      readonly group: 'vehicle';
      readonly brand: string;
      readonly model: string;
      /** Remote kayıtlarda boş olabilir; değeri olmayan özellik satırı gösterilmez. */
      readonly modelYear?: number;
      readonly odometerKm?: number;
      readonly fuel?: FuelType;
      readonly gearbox?: Gearbox;
      readonly bodyType?: string;
      readonly damageStatus?: DamageStatus;
      readonly driveConfig?: DriveConfig;
    }
  | {
      readonly group: 'trailer';
      readonly brand: string;
      readonly model?: string;
      readonly modelYear?: number;
      readonly axles?: TrailerAxles;
      readonly bodyType?: string;
      readonly damageStatus?: DamageStatus;
    }
  | { readonly group: 'estate'; readonly areaM2?: number; readonly rooms?: RoomCount; readonly propertyType?: string }
  | { readonly group: 'land'; readonly areaM2?: number; readonly landUse?: string };

export type ListingDetail = ListingSummary & {
  readonly description: string;
  readonly specs: ListingSpecs;
  /** Galeri sırası: kapak ilk. `photoCount`/`hasVideo` ile tutarlıdır. */
  readonly media: readonly MediaItem[];
};
