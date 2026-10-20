import {
  CATEGORY_CATALOG,
  asListingId,
  asMediaId,
  isCategoryId,
  isValidCoordinates,
  type CategoryId,
  type DamageStatus,
  type DriveConfig,
  type FuelType,
  type Gearbox,
  type ListingDetail,
  type ListingSpecs,
  type ListingStatus,
  type ListingSummary,
  type MediaItem,
  type RoomCount,
  type TrailerAxles,
} from '@/domain';

import type { Json, Tables } from './database.types';
import { tlToKurus, toIso } from './shared';

/** Özet/kart için seçilen sütunlar (detay `*` + medya ile genişler). */
export const SUMMARY_COLUMNS =
  'id, listing_no, title, category_slug, subtype, price, currency, city, district, latitude, longitude, published_at, created_at, status, photo_count, has_video, cover_url, brand, model, year, km, attributes, is_featured';

export type ListingRow = Pick<
  Tables<'listings'>,
  | 'id'
  | 'listing_no'
  | 'title'
  | 'category_slug'
  | 'subtype'
  | 'price'
  | 'currency'
  | 'city'
  | 'district'
  | 'latitude'
  | 'longitude'
  | 'published_at'
  | 'created_at'
  | 'status'
  | 'photo_count'
  | 'has_video'
  | 'cover_url'
  | 'brand'
  | 'model'
  | 'year'
  | 'km'
  | 'attributes'
  | 'is_featured'
>;

export type MediaRow = Pick<Tables<'listing_media'>, 'id' | 'url' | 'type' | 'sort_order'>;

/** "Yeni" rozeti: son 7 günde yayımlanan ilan. */
const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Sunucu durumları: draft/unpublished kullanıcıya "yayından kalktı" olarak gösterilir (RLS zaten çoğunu gizler). */
export function toListingStatus(status: string): ListingStatus {
  if (status === 'published' || status === 'reserved' || status === 'sold') return status;
  return 'withdrawn';
}

/** Bilinmeyen kategori slug'ı kataloğun ilk kategorisine düşmez: Kamyon varsayılır ama ilan yine gösterilir. */
export const toCategoryId = (slug: string): CategoryId => (isCategoryId(slug) ? slug : 'kamyon');

/** Uzak kayıtta alt türler `4×2` yazılır; domain `4x2` kullanır. */
export const normalizeSubtype = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/×/g, 'x') : undefined;
};

/** Domain alt türü → uzak kayıtta eşleşebilecek yazımlar (`4x2` → `4x2`, `4×2`). */
export const subtypeVariants = (value: string): string[] => Array.from(new Set([value, value.replace(/x/g, '×')]));

const asRecord = (value: Json | null | undefined): Record<string, Json | undefined> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Json | undefined>) : {};

const text = (value: Json | undefined): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);
const num = (value: Json | undefined): number | undefined => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const pick = <T extends string>(value: string | undefined, allowed: readonly T[], aliases: Record<string, T> = {}): T | undefined => {
  if (!value) return undefined;
  const key = value.toLocaleLowerCase('tr-TR');
  if ((allowed as readonly string[]).includes(key)) return key as T;
  return aliases[key];
};

const FUEL: readonly FuelType[] = ['diesel', 'petrol', 'lpg', 'electric', 'hybrid'];
const FUEL_ALIASES: Record<string, FuelType> = { dizel: 'diesel', benzin: 'petrol', elektrik: 'electric', hibrit: 'hybrid' };
const GEARBOX: readonly Gearbox[] = ['manual', 'automatic', 'semi-automatic'];
const GEARBOX_ALIASES: Record<string, Gearbox> = { manuel: 'manual', otomatik: 'automatic', 'yarı otomatik': 'semi-automatic', 'yari otomatik': 'semi-automatic' };
const DAMAGE: readonly DamageStatus[] = ['none', 'repaired', 'damaged'];
const DAMAGE_ALIASES: Record<string, DamageStatus> = { hasarsız: 'none', hasarsiz: 'none', onarımlı: 'repaired', onarimli: 'repaired', hasarlı: 'damaged', hasarli: 'damaged' };
const DRIVE: readonly DriveConfig[] = ['4x2', '6x2', '6x4'];
const ROOMS: readonly RoomCount[] = ['1+1', '2+1', '3+1', '4+1'];

function toAxles(value: number | undefined): TrailerAxles | undefined {
  return value === 2 || value === 3 || value === 4 ? value : undefined;
}

/**
 * Özellik tablosu: sabit sütunlar (marka, model, yıl, km) + `attributes` JSON'undaki isteğe bağlı alanlar. Değeri olmayan alan
 * `undefined` kalır ve ekranda satır üretmez.
 */
export function toSpecs(row: ListingRow): ListingSpecs {
  const categoryId = toCategoryId(row.category_slug);
  const attrs = asRecord(row.attributes);
  const brand = row.brand?.trim() ?? '';
  const model = row.model?.trim() ?? '';
  const modelYear = row.year ?? undefined;
  const bodyType = text(attrs.body_type);
  const damageStatus = pick(text(attrs.damage_status), DAMAGE, DAMAGE_ALIASES);

  switch (CATEGORY_CATALOG[categoryId].group) {
    case 'trailer':
      return { group: 'trailer', brand, model: model || undefined, modelYear, axles: toAxles(num(attrs.axle_count)), bodyType, damageStatus };
    case 'estate':
      return {
        group: 'estate',
        areaM2: num(attrs.area_m2),
        rooms: pick(text(attrs.rooms), ROOMS),
        propertyType: text(attrs.property_type) ?? normalizeSubtype(row.subtype),
      };
    case 'land':
      return { group: 'land', areaM2: num(attrs.area_m2), landUse: text(attrs.land_use) ?? normalizeSubtype(row.subtype) };
    default: {
      const subtype = normalizeSubtype(row.subtype);
      const driveConfig = pick(text(attrs.drive_config) ?? subtype, DRIVE);
      return {
        group: 'vehicle',
        brand,
        model,
        modelYear,
        odometerKm: row.km ?? undefined,
        fuel: pick(text(attrs.fuel), FUEL, FUEL_ALIASES),
        gearbox: pick(text(attrs.gearbox), GEARBOX, GEARBOX_ALIASES),
        bodyType,
        damageStatus,
        driveConfig,
      };
    }
  }
}

export function toListingSummary(row: ListingRow, nowMs: number = Date.now()): ListingSummary {
  const publishedAt = toIso(row.published_at ?? row.created_at);
  const coordinates = { latitude: row.latitude ?? NaN, longitude: row.longitude ?? NaN };
  return {
    id: asListingId(row.id),
    listingNumber: String(row.listing_no),
    title: row.title,
    categoryId: toCategoryId(row.category_slug),
    subcategory: normalizeSubtype(row.subtype),
    price: { amountKurus: tlToKurus(row.price), currency: 'TRY' },
    location: {
      city: row.city,
      district: row.district ?? '',
      ...(isValidCoordinates(coordinates) ? { coordinates } : {}),
    },
    publishedAt,
    status: toListingStatus(row.status),
    isNew: nowMs - Date.parse(publishedAt) < NEW_BADGE_MS,
    photoCount: row.photo_count,
    hasVideo: row.has_video,
    coverImageUri: row.cover_url,
    financing: text(asRecord(row.attributes).financing) ?? null,
    isFeatured: row.is_featured,
    ...(row.year != null ? { modelYear: row.year } : {}),
    ...(row.km != null ? { odometerKm: row.km } : {}),
  };
}

export function toMediaItem(row: MediaRow): MediaItem {
  const uri = row.url || null;
  const kind = row.type === 'video' ? 'video' : 'photo';
  // Fotoğrafın küçük resmi aynı görseldir (expo-image önbellekler); videonun ayrı küçük resmi henüz yok.
  return { id: asMediaId(row.id), kind, uri, thumbnailUri: kind === 'photo' ? uri : null };
}

/** Detay: özet + açıklama + özellikler + medya (galeri sırası; fotoğraflar önce, video sonda — tasarım 12/26). */
export function toListingDetail(row: ListingRow & { description: string | null; listing_media: readonly MediaRow[] }): ListingDetail {
  const summary = toListingSummary(row);
  const sorted = [...row.listing_media].sort((a, b) => a.sort_order - b.sort_order);
  let media = [...sorted.filter((m) => m.type !== 'video'), ...sorted.filter((m) => m.type === 'video')].map(toMediaItem);
  // Medya tablosu boşsa kapak görseli tek fotoğraf olarak gösterilir.
  if (media.length === 0 && row.cover_url) media = [{ id: asMediaId(`${row.id}-cover`), kind: 'photo', uri: row.cover_url, thumbnailUri: row.cover_url }];
  const photoCount = media.filter((item) => item.kind === 'photo').length;
  return {
    ...summary,
    photoCount: Math.max(photoCount, 0),
    hasVideo: media.some((item) => item.kind === 'video'),
    description: row.description?.trim() ?? '',
    specs: toSpecs(row),
    media,
  };
}
