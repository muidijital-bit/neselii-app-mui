/**
 * Filtre ekranındaki açılır seçimlerin ÖNERİ listeleri. Bunlar domain kısıtı değildir: kullanıcı listede olmayan marka/yıl da yazabilir
 * ve mevcut değer her zaman korunur. Asıl öneriler sunucudaki ilanların markalarıdır (`listBrands`); bu liste yalnızca yedektir
 * (marka sorgusu yüklenemezse kullanılır).
 */
export const VEHICLE_BRAND_OPTIONS: readonly string[] = [
  'BMC',
  'BMW',
  'Caterpillar',
  'DAF',
  'Fiat',
  'Ford',
  'Ford Trucks',
  'Hyundai',
  'Isuzu',
  'Iveco',
  'JCB',
  'Komatsu',
  'MAN',
  'Mercedes-Benz',
  'Renault',
  'Scania',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

export const TRAILER_BRAND_OPTIONS: readonly string[] = ['Güleryüz', 'Kässbohrer', 'Seyit Usta', 'Tırsan'];

export const MODEL_YEAR_FIRST = 1950;
export const MODEL_YEAR_LAST = 2027;

/** 2027 → 1950 (yeniden eskiye). */
export const MODEL_YEAR_OPTIONS: readonly string[] = Array.from({ length: MODEL_YEAR_LAST - MODEL_YEAR_FIRST + 1 }, (_, i) => String(MODEL_YEAR_LAST - i));
