import {
  CATEGORY_CATALOG,
  formatInteger,
  formatLocation,
  formatMoney,
  formatRelativeDate,
  type DamageStatus,
  type FuelType,
  type Gearbox,
  type ListingDetail,
  type ListingSpecs,
  type ListingSummary,
} from '@/domain';
import type { StatusVariant } from '@/components/Badge';

export type ListingCardModel = {
  readonly id: string;
  readonly title: string;
  readonly location: string;
  readonly dateLabel: string;
  readonly price: string;
  readonly category: string;
  readonly photoCount: number;
  readonly hasVideo: boolean;
  readonly status?: StatusVariant;
  readonly imageUri?: string;
  /** Fiyatın "TL"siz kısmı (`6.450.000`): 2. aşama kartlarında "TL" küçük yazılır. */
  readonly priceAmount: string;
  readonly yearLabel?: string;
  readonly kmLabel?: string;
  readonly city: string;
  /** Tam finansman metni (`Kredi kartına 18 ay taksit`) ve kart rozetindeki kısa hali (`18 ay taksit`, `%2,85 kredi`). */
  readonly financing?: string;
  readonly financingShort?: string;
  readonly featured: boolean;
};

/** Finansman metninin rozet hali: `%2,85 faizli kredi` → `%2,85 kredi`, `Kredi kartına 18 ay taksit` → `18 ay taksit`. */
export function financingShortLabel(financing: string): string {
  const rate = /%\s?[\d.,]+/.exec(financing);
  if (rate) return `${rate[0].replace(/\s/g, '')} kredi`;
  const months = /(\d+)\s*ay/i.exec(financing);
  if (months && /taksit/i.test(financing)) return `${months[1]} ay taksit`;
  return /taksit/i.test(financing) ? 'Taksit' : 'Kredi';
}

/** Kartta gösterilecek rozet: satıldı > rezerve > yeni; sıradan yayındaki ilanda rozet yoktur (tasarım). */
export function cardStatus(listing: Pick<ListingSummary, 'status' | 'isNew'>): StatusVariant | undefined {
  if (listing.status === 'sold') return 'satildi';
  if (listing.status === 'reserved') return 'rezerve';
  if (listing.status === 'published' && listing.isNew) return 'yeni';
  return undefined;
}

/** Servis özeti → kart gösterim metinleri (biçimlendirme UI sınırında; servis/domain fiyatı sayısal tutar). */
export function toCardModel(listing: ListingSummary, nowMs: number): ListingCardModel {
  return {
    id: listing.id,
    title: listing.title,
    location: formatLocation(listing.location),
    dateLabel: formatRelativeDate(listing.publishedAt, nowMs),
    price: formatMoney(listing.price),
    category: CATEGORY_CATALOG[listing.categoryId].name,
    photoCount: listing.photoCount,
    hasVideo: listing.hasVideo,
    status: cardStatus(listing),
    imageUri: listing.coverImageUri ?? undefined,
    priceAmount: formatInteger(Math.floor(listing.price.amountKurus / 100)),
    ...(listing.modelYear !== undefined ? { yearLabel: String(listing.modelYear) } : {}),
    ...(listing.odometerKm !== undefined ? { kmLabel: `${formatInteger(listing.odometerKm)} km` } : {}),
    city: listing.location.city,
    ...(listing.financing ? { financing: listing.financing, financingShort: financingShortLabel(listing.financing) } : {}),
    featured: listing.isFeatured,
  };
}

const FUEL_LABEL: Record<FuelType, string> = { diesel: 'Dizel', petrol: 'Benzin', lpg: 'LPG', electric: 'Elektrik', hybrid: 'Hibrit' };
const GEARBOX_LABEL: Record<Gearbox, string> = { manual: 'Manuel', automatic: 'Otomatik', 'semi-automatic': 'Yarı otomatik' };
const DAMAGE_LABEL: Record<DamageStatus, string> = { none: 'Hasarsız', repaired: 'Onarımlı', damaged: 'Hasarlı' };

export type SpecRow = { readonly key: string; readonly label: string; readonly value: string };

/** Kategoriye uygun `Özellikler` satırları (tasarım 07 sırası); değeri olmayan alan satır üretmez. */
export function specRows(specs: ListingSpecs): readonly SpecRow[] {
  const rows: SpecRow[] = [];
  const add = (key: string, label: string, value: string | number | undefined) => {
    if (value === undefined || value === '') return;
    rows.push({ key, label, value: String(value) });
  };
  switch (specs.group) {
    case 'vehicle':
      add('brand', 'Marka', specs.brand);
      add('model', 'Model', specs.model);
      add('modelYear', 'Model Yılı', specs.modelYear);
      add('odometer', 'Kilometre', specs.odometerKm === undefined ? undefined : `${formatInteger(specs.odometerKm)} km`);
      add('fuel', 'Yakıt', specs.fuel && FUEL_LABEL[specs.fuel]);
      add('gearbox', 'Vites', specs.gearbox && GEARBOX_LABEL[specs.gearbox]);
      add('drive', 'Çekiş', specs.driveConfig);
      add('body', 'Kasa Tipi', specs.bodyType);
      add('damage', 'Hasar Durumu', specs.damageStatus && DAMAGE_LABEL[specs.damageStatus]);
      break;
    case 'trailer':
      add('brand', 'Marka', specs.brand);
      add('model', 'Model', specs.model);
      add('modelYear', 'Model Yılı', specs.modelYear);
      add('axles', 'Aks Sayısı', specs.axles);
      add('body', 'Kasa Tipi', specs.bodyType);
      add('damage', 'Hasar Durumu', specs.damageStatus && DAMAGE_LABEL[specs.damageStatus]);
      break;
    case 'estate':
      add('type', 'Emlak Tipi', specs.propertyType);
      add('area', 'Alan', specs.areaM2 === undefined ? undefined : `${formatInteger(specs.areaM2)} m²`);
      add('rooms', 'Oda Sayısı', specs.rooms);
      break;
    case 'land':
      add('use', 'Kullanım Amacı', specs.landUse);
      add('area', 'Alan', specs.areaM2 === undefined ? undefined : `${formatInteger(specs.areaM2)} m²`);
      break;
  }
  return rows;
}

/** Detaydaki durum rozeti (tasarım 07: fiyatın yanında `Yayında`); "Yeni" yalnızca kart rozetidir. */
export function detailStatus(status: ListingSummary['status']): StatusVariant | undefined {
  if (status === 'published') return 'yayinda';
  if (status === 'reserved') return 'rezerve';
  if (status === 'sold') return 'satildi';
  return undefined;
}

export type ListingDetailModel = ListingCardModel & {
  readonly listingNumber: string;
  readonly kicker: string;
  readonly description: string;
  readonly specRows: readonly SpecRow[];
  readonly shareText: string;
};

/** Detay gösterimi: başlık/fiyat/konum/tarih/kategori kartla AYNI `toCardModel`'den gelir; `listingNumber` yalnızca gösterim alanıdır. */
export function toDetailModel(detail: ListingDetail, nowMs: number): ListingDetailModel {
  const card = toCardModel(detail, nowMs);
  return {
    ...card,
    status: detailStatus(detail.status),
    listingNumber: detail.listingNumber,
    kicker: detail.subcategory ? `${card.category} · ${detail.subcategory}` : card.category,
    description: detail.description,
    specRows: specRows(detail.specs),
    shareText: `${detail.title} · İlan no: ${detail.listingNumber} · Neşeli Kamyon Tır Pazarı`,
  };
}
