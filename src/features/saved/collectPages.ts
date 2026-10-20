import { appError, type Page } from '@/domain';

/** Tarama üst sınırı (sonsuz/bozuk imleç döngüsüne karşı koruma); 20'şerli sayfalarla 2.000 kayıt. */
export const MAX_SWEEP_PAGES = 100;

/**
 * Mevcut `list` sözleşmesiyle (yeni servis metodu yok) hesabın TÜM sayfalarını toplar. Favori kartı/detay/profil sayacı ve kayıtlı arama
 * "zaten kayıtlı mı" kararı bu tek tam listeden türer, böylece yüzeyler ayrışmaz. Sonuç yalnızca bitiş imleci (`nextCursor === null`) GÖRÜLDÜYSE
 * tamdır; tamlık görülemezse (sınırda imleç hâlâ doluysa ya da aynı imleç tekrar ederse) hata fırlatır — kısmi liste sayaç/kalp durumu olarak
 * sunulmaz. Aynı kayıt iki sayfada görünürse (`keyOf`) ilk görüldüğü yerde kalır.
 */
export async function collectAllPages<T>(
  listPage: (cursor: string | undefined) => Promise<Page<T>>,
  keyOf: (item: T) => string,
  /** Her sayfadan sonra çağrılır (oturum doğrulaması gibi; fırlatabilir). */
  afterPage: () => void = () => undefined,
  maxPages: number = MAX_SWEEP_PAGES,
): Promise<T[]> {
  const items: T[] = [];
  const seenKeys = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  for (let pages = 0; pages < maxPages; pages += 1) {
    const page = await listPage(cursor);
    afterPage();
    for (const item of page.items) {
      const key = keyOf(item);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      items.push(item);
    }
    if (page.nextCursor === null) return items;
    if (seenCursors.has(page.nextCursor)) throw appError.unknown('list sweep: imleç tekrarı', 'unexpected');
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw appError.unknown(`list sweep: ${maxPages} sayfa sınırında bitiş imleci görülmedi`, 'unexpected');
}
