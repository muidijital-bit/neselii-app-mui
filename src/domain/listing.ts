import type { CategoryId } from './categories';
import type { IsoDateTime, Money } from './common';
import type { ListingId, MediaId } from './ids';
import type { ListingInsights } from './insights';

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

/** Madde 7: video bölümü. */
export type VideoSection = 'cold_start' | 'cabin' | 'engine' | 'undercarriage' | 'body';

export const VIDEO_SECTIONS: readonly { readonly id: VideoSection; readonly label: string }[] = [
  { id: 'cold_start', label: 'Soğuk çalıştırma' },
  { id: 'cabin', label: 'Kabin' },
  { id: 'engine', label: 'Motor' },
  { id: 'undercarriage', label: 'Alt takım' },
  { id: 'body', label: 'Kasa' },
];

export const isVideoSection = (value: unknown): value is VideoSection => VIDEO_SECTIONS.some((s) => s.id === value);

export type MediaItem = {
  readonly id: MediaId;
  readonly kind: 'photo' | 'video';
  /** Madde 7: videonun bölümü (yönetici etiketler); etiketsizse yok. */
  readonly section?: VideoSection;
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
/** Kabin tipi (madde 3): normal, yüksek tavan, yataklı. */
export type CabType = 'standard' | 'high' | 'sleeper';
export const CAB_TYPES: readonly CabType[] = ['standard', 'high', 'sleeper'];
export const CAB_TYPE_LABELS: Record<CabType, string> = { standard: 'Normal', high: 'Yüksek tavan', sleeper: 'Yataklı' };

/** Ticari araca özel teknik bilgiler (madde 3). Yönetici girer; filtrelerde tonaj, motor gücü ve kabin kullanılır. */
export type CommercialSpecs = {
  /** Azami yüklü ağırlık (ton). */
  readonly tonnage?: number;
  readonly enginePowerHp?: number;
  readonly cabType?: CabType;
  /** Şasi bilgisi (ör. "Uzun şasi, 7,2 m"). */
  readonly chassis?: string;
  /** Üstyapı (ör. "Hidrolik damper, Hardox kasa"). */
  readonly bodyBuilder?: string;
};

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
    } & CommercialSpecs
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
  /** Madde 33: onaylı rezervasyonun bitişi (ilan rezerve ise); yoksa `null`. */
  readonly reservedUntil: IsoDateTime | null;
  /** Yöneticinin girdiği geçmiş, güven kontrolleri ve uzman görüşü (madde 11–13); girilmemişse `null`. */
  readonly insights: ListingInsights | null;
};
