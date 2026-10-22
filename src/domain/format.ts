import type { IsoDateTime, Money } from './common';
import type { ListingLocation } from './listing';

/**
 * Gösterim biçimleri (tr-TR). Saf ve platformdan bağımsızdır: Hermes'te `Intl` kapsamına güvenilmez, bu yüzden elle biçimlenir.
 * Servis/domain fiyatı kuruş (tam sayı) tutar; metne yalnızca UI sınırında çevrilir.
 */

/** `285000000` kuruş → `2.850.000 TL`. Kuruş kısmı sıfır değilse virgülle gösterilir: `1.250,50 TL`. */
export function formatMoney({ amountKurus }: Money): string {
  const lira = Math.floor(amountKurus / 100);
  const kurus = amountKurus % 100;
  const fraction = kurus === 0 ? '' : `,${String(kurus).padStart(2, '0')}`;
  return `${formatInteger(lira)}${fraction} TL`;
}

/** `1234567` → `1.234.567` (binlik ayracı nokta). */
export function formatInteger(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return value < 0 ? `-${grouped}` : grouped;
}

/**
 * Kısa TL özeti (filtre başlığı gibi dar yerler): `0` → `0 TL`, `850000` → `850 Bin TL`, `3850000` → `3,85 Mn TL`, `1000000` → `1 Mn TL`.
 * Milyonda en çok iki ondalık (Türkçe virgül, sondaki sıfırlar atılır); 1.000'in altı olduğu gibi yazılır.
 */
export function formatCompactTl(value: number): string {
  const tl = Math.max(0, Math.round(value));
  // 999.500 ve üstü yuvarlanınca "1.000 Bin" olmasın: milyona geçer.
  if (tl >= 999_500) {
    const [whole, fraction] = (Math.round(tl / 10_000) / 100).toFixed(2).split('.');
    const decimals = fraction.replace(/0+$/, '');
    return `${formatInteger(Number(whole))}${decimals ? `,${decimals}` : ''} Mn TL`;
  }
  if (tl >= 1000) return `${formatInteger(Math.round(tl / 1000))} Bin TL`;
  return `${formatInteger(tl)} TL`;
}

/** `Ankara / Yenimahalle`; ilçe boşsa yalnızca şehir. */
export const formatLocation = ({ city, district }: ListingLocation): string => [city, district].map((part) => part.trim()).filter(Boolean).join(' / ');

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;
const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;
const DAY_MS = 86_400_000;
/** Türkiye kalıcı olarak UTC+3'tür; gün sınırları cihaz saat dilimine değil Türkiye gününe göre hesaplanır. */
const TURKEY_OFFSET_MS = 3 * 3_600_000;

const turkeyDay = (ms: number) => Math.floor((ms + TURKEY_OFFSET_MS) / DAY_MS);

/**
 * İlan tarihi etiketi: `Bugün`, `Dün`, `3 gün önce` (2–6), `1 hafta önce` / `2 hafta önce` (7–27 gün), daha eskisi `12 Eki`
 * (başka yılsa `12 Eki 2025`). Gelecekteki tarih `Bugün` sayılır. `nowMs` dışarıdan verilir (testlerde sabit).
 */
export function formatRelativeDate(iso: IsoDateTime, nowMs: number): string {
  const thenMs = Date.parse(iso);
  if (!Number.isFinite(thenMs)) return '';
  const days = turkeyDay(nowMs) - turkeyDay(thenMs);
  if (days <= 0) return 'Bugün';
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 28) return `${Math.floor(days / 7)} hafta önce`;
  const then = new Date(thenMs + TURKEY_OFFSET_MS);
  const label = `${then.getUTCDate()} ${MONTHS_SHORT[then.getUTCMonth()]}`;
  const sameYear = then.getUTCFullYear() === new Date(nowMs + TURKEY_OFFSET_MS).getUTCFullYear();
  return sameYear ? label : `${label} ${then.getUTCFullYear()}`;
}

/** Metin aramasında kullanılan katlama: büyük/küçük harf ve Türkçe aksan farkı yok sayılır (`İş` = `is`). */
export function foldForSearch(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .trim();
}

/** Profil özeti için üyelik ayı: `2026-03-01T09:00:00.000Z` → `Mart 2026` (Türkiye saatiyle). Geçersiz tarih boş metin verir. */
export function formatMemberSince(iso: IsoDateTime): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms + TURKEY_OFFSET_MS);
  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
