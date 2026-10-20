import type { Coordinates, ListingSummary } from './listing';

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Sonlu ve gerçek dünya aralığında (enlem ±90, boylam ±180) koordinat. Bozuk/NaN/aralık dışı değer yakınlık hesabına girmez. */
export function isValidCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const { latitude, longitude } = value as Partial<Record<keyof Coordinates, unknown>>;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** İki nokta arası büyük daire uzaklığı (haversine), kilometre. Saf ve cihazda hesaplanır; hiçbir yere gönderilmez. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Yakınlık sırası kullanılabilir mi? Yalnızca kullanıcı tercihi açık, sistem konum izni verilmiş VE cihaz koordinatı alınmışsa `nearest`.
 * Tercih açık ama izin/koordinat yoksa `fallback` (en yeni + açıklama); tercih kapalıysa `off` (açıklama yok, normal sıra).
 */
export type NearbyOrder = 'nearest' | 'fallback' | 'off';

export function resolveNearbyOrder(input: { readonly preferred: boolean; readonly permissionGranted: boolean; readonly origin: Coordinates | null }): NearbyOrder {
  if (!input.preferred) return 'off';
  return input.permissionGranted && input.origin !== null && isValidCoordinates(input.origin) ? 'nearest' : 'fallback';
}

/**
 * İlanları `origin`'e uzaklığa göre dizer (yakın önce). Eşit uzaklıkta mevcut sıra korunur (kararlı sıralama; servis zaten en yeni + kimlik
 * tie-breaker verir). Geçerli koordinatı olmayan ilan sona düşer ve kendi aralarında mevcut sırada kalır. Girdi değiştirilmez; koordinat hiçbir yere yazılmaz.
 */
export function sortByProximity<T extends Pick<ListingSummary, 'location'>>(items: readonly T[], origin: Coordinates): readonly T[] {
  const keyed = items.map((item, index) => {
    const at = item.location.coordinates;
    return { item, index, km: isValidCoordinates(at) ? distanceKm(origin, at) : Number.POSITIVE_INFINITY };
  });
  keyed.sort((a, b) => (a.km === b.km ? a.index - b.index : a.km - b.km));
  return keyed.map((entry) => entry.item);
}
