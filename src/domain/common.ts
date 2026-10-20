/** ISO 8601, her zaman UTC ve `Z` ekli: `2026-10-01T09:00:00.000Z`. Gösterim yerel saate/tr-TR'ye UI katmanında çevrilir. */
export type IsoDateTime = string;

/** Fiyat: tam sayı kuruş + para birimi. Yalnızca TRY; gösterim (`2.850.000 TL`) tr-TR ile UI/format katmanında yapılır. */
export type Money = { readonly amountKurus: number; readonly currency: 'TRY' };

/** Kapalı veya açık aralık; alanlar sayıdır (string değil), alt sınır üst sınırı aşamaz (doğrulama 009'da). */
export type Range = { readonly min?: number; readonly max?: number };

/** Cursor tabanlı sayfa. `nextCursor === null` son sayfa demektir. İmleç opaktır; istemci içeriğini yorumlamaz. */
export type Page<T> = { readonly items: readonly T[]; readonly nextCursor: string | null };

/** Sayfalı listeleme girişi. Parametresiz çağrı ilk sayfayı verir; sonraki sayfa için önceki yanıtın `nextCursor`'ı geçilir. */
export type PageInput = { readonly cursor?: string };

export const PAGE_SIZE = 20;

export type Unsubscribe = () => void;

export const money = (amountKurus: number): Money => {
  if (!Number.isSafeInteger(amountKurus) || amountKurus < 0) {
    throw new RangeError(`Kuruş tam sayı ve negatif olmayan olmalı: ${amountKurus}`);
  }
  return { amountKurus, currency: 'TRY' };
};

/** TL → kuruş yardımcısı (fixture yazarken): `lira(2_850_000)` = 285.000.000 kuruş. */
export const lira = (tl: number): Money => money(Math.round(tl * 100));
