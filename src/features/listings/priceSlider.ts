/**
 * Fiyat kaydırıcısı ölçeği (TL). Ölçek yalnızca YARDIMCIDIR, domain kısıtı değildir: yazılı geçerli değerler asla kırpılmaz,
 * gerekirse ölçek genişler (ve kullanıcı sürüklerken geri daralmaz).
 */
export const PRICE_SLIDER_BASE_MAX_TL = 5_000_000;
export const PRICE_SLIDER_STEP_TL = 50_000;
const SCALE_ROUND_TL = 1_000_000;

/** En az `base` olan, verilen değerlerin hepsini kapsayan ölçek (üst sınır milyona yuvarlanır). */
export function scaleFor(base: number, ...values: readonly (number | undefined)[]): number {
  const top = Math.max(0, ...values.filter((v): v is number => v !== undefined));
  return Math.max(base, Math.ceil(top / SCALE_ROUND_TL) * SCALE_ROUND_TL);
}

export const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

/** En yakın adıma yuvarlar; ölçek sonunu da yakalar. */
export const snapToStep = (value: number, step: number, scaleMax: number): number => clamp(Math.round(value / step) * step, 0, scaleMax);

export type Thumb = 'min' | 'max';

/**
 * Bir ucun yeni değeri: uçlar birbirini geçemez. Kaydırıcının sınırındaki uç (alt uç 0, üst uç ölçek sonu) "sınır yok" demektir
 * ve alanı boşaltır (`null`); aksi halde TL değeri döner.
 */
export function nextEnd(thumb: Thumb, wanted: number, effMin: number, effMax: number, scaleMax: number): { value: number; text: number | null } {
  const value = thumb === 'min' ? clamp(wanted, 0, effMax) : clamp(wanted, effMin, scaleMax);
  const open = thumb === 'min' ? value <= 0 : value >= scaleMax;
  return { value, text: open ? null : value };
}
