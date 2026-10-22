import { CATEGORY_CATALOG, formatInteger, type DamageStatus, type FuelType, type Gearbox, type ListingSpecs, type ListingSummary } from '@/domain';
import type { IconName } from '@/ui/Icon';
import type { ListingView } from '@/ui/listingView';

/** Fotoğrafsız ilanın yer tutucusundaki kategori ikonu (main tasarımındaki eşleme). */
export const CATEGORY_ICONS: Record<ListingSummary['categoryId'], IconName> = {
  kamyon: 'mci:truck-outline',
  cekici: 'mci:truck-trailer',
  dorse: 'mci:cube-outline',
  otomobil: 'mci:car-outline',
  'ticari-arac': 'mci:van-utility',
  'is-makinesi': 'mci:excavator',
  gayrimenkul: 'mci:office-building-outline',
  arsa: 'mci:map-marker-radius-outline',
};

/** Domain ilanı → main tasarımındaki kart / karo / vitrin bileşenlerinin gösterim alanları. */
export function toListingView(listing: ListingSummary): ListingView {
  return {
    id: listing.id,
    title: listing.title,
    coverUri: listing.coverImageUri,
    categoryName: CATEGORY_CATALOG[listing.categoryId].name,
    categoryIcon: CATEGORY_ICONS[listing.categoryId],
    subtype: listing.subcategory ?? null,
    status: listing.status,
    year: listing.modelYear ?? null,
    km: listing.odometerKm ?? null,
    city: listing.location.city,
    price: Math.floor(listing.price.amountKurus / 100),
    financing: listing.financing,
    publishedAt: listing.publishedAt,
    photoCount: listing.photoCount,
    hasVideo: listing.hasVideo,
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
