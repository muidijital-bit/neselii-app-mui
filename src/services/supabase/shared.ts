import { AppError, appError, isAppError, PAGE_SIZE, toAppError, type Page } from '@/domain';

import type { Supabase } from './client';

/**
 * Supabase / PostgREST / Auth hatalarını `AppError`'a çevirir. Ham metin kullanıcıya gitmez (yalnızca `cause`'ta durur).
 *  - Satır yok (`PGRST116`) ve yabancı anahtar ihlali (`23503`, olmayan ilan) → `notFound`
 *  - JWT/RLS yetki hataları → `unauthenticated`
 *  - Ağ hataları → `offline`; geri kalanı `unknown`
 */
export function toSupabaseError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error && typeof error === 'object') {
    const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
    if (code === 'PGRST116' || code === '23503' || code === '22P02') return appError.notFound(String(message ?? code));
    // RLS ihlali (ör. satılmış ilana yeni sohbet): oturum geçerlidir, işlem bu kayıt için kapalıdır.
    if (code === '42501') return new AppError({ kind: 'unknown', code: 'unavailable', cause: error });
    if (code === 'PGRST301' || code === 'session_not_found' || code === 'bad_jwt' || status === 401) {
      return new AppError({ kind: 'unauthenticated', code: 'unauthenticated', cause: error });
    }
    if (typeof message === 'string' && /network request failed|failed to fetch|fetch failed|load failed/i.test(message)) return appError.offline(error);
    if (status === 0) return appError.offline(error);
  }
  return toAppError(error);
}

type Result = { data: unknown; error: unknown };

/** Veri DÖNMESİ GEREKEN sorgu sonucunu açar: hata → `AppError`; veri yok → `notFound`. */
export function unwrap<R extends Result>(result: R): NonNullable<R['data']> {
  if (result.error) throw toSupabaseError(result.error);
  if (result.data === null || result.data === undefined) throw appError.notFound();
  return result.data as NonNullable<R['data']>;
}

/** `maybeSingle()` sonucu: hata → `AppError`; kayıt yoksa `null`. */
export function unwrapMaybe<R extends Result>(result: R): NonNullable<R['data']> | null {
  if (result.error) throw toSupabaseError(result.error);
  return (result.data ?? null) as NonNullable<R['data']> | null;
}

/** Gövdesiz yazma (insert/update/delete `select`'siz): yalnızca hatayı denetler. */
export function ensure(result: { error: unknown }): void {
  if (result.error) throw toSupabaseError(result.error);
}

/** Her servis çağrısını sarar: içeride ne fırlarsa fırlasın dışarı yalnızca `AppError` çıkar. */
export async function call<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toSupabaseError(error);
  }
}

/** Oturumdaki kullanıcının kimliği; oturum yoksa `unauthenticated`. Ağa çıkmaz (yerel oturum okunur). */
export async function requireUserId(sb: Supabase): Promise<string> {
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw appError.unauthenticated();
  return id;
}

// --- Sayfalama -----------------------------------------------------------------------------------------------------

const CURSOR = /^cur_(\d+)$/;

/** Opak imleç (`cur_<ofset>`) → ofset. Bozuk imleç `validation`. */
export function offsetOf(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const match = CURSOR.exec(cursor);
  if (!match) throw appError.validation({ cursor: 'Geçersiz sayfa imleci' });
  return Number(match[1]);
}

/**
 * `PAGE_SIZE + 1` kayıt istenir; fazlası varsa sonraki sayfa vardır. `rows` sorgunun döndürdüğü (en çok PAGE_SIZE+1) kayıtlardır.
 */
export function toPage<Row, Item>(rows: readonly Row[], offset: number, map: (row: Row) => Item): Page<Item> {
  const hasMore = rows.length > PAGE_SIZE;
  const items = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).map(map);
  return { items, nextCursor: hasMore ? `cur_${offset + PAGE_SIZE}` : null };
}

/** `range(from, to)` için sınırlar (PAGE_SIZE + 1 kayıt). */
export const pageRange = (offset: number): [number, number] => [offset, offset + PAGE_SIZE];

/** Postgres zaman damgası → ISO UTC (`...Z`). */
export const toIso = (value: string | null | undefined): string => {
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

/** Fiyat (TL, numeric) → tam sayı kuruş. */
export const tlToKurus = (price: number | string | null | undefined): number => {
  const value = typeof price === 'string' ? Number(price) : (price ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
};

/** Kuruş → TL (sorgu filtresi için). */
export const kurusToTl = (kurus: number): number => kurus / 100;
