import { appError, type AppNotification, type Page } from '@/domain';

/** Toplu işaretlemede tarama üst sınırı (sonsuz/bozuk imleç döngüsüne karşı koruma); 20'şerli sayfalarla 2.000 bildirim. */
export const MAX_SWEEP_PAGES = 100;

/**
 * Hesaba ait TÜM sayfaları gezip okunmamış bildirim kimliklerini toplar. Sonuç yalnızca bitiş imleci (`nextCursor === null`) GÖRÜLDÜYSE
 * tamdır; tamlık görülemezse (güvenlik sınırı dolduğunda imleç hâlâ doluysa ya da aynı imleç tekrar ederse) hata fırlatır ve çağıran
 * hiçbir şey yazmaz — kısmi liste "Tümünü oku" başarısı sayılmaz. Tam sınırdaki son sayfa `nextCursor: null` ise başarıdır.
 * `afterPage` her sayfadan sonra çağrılır (oturum doğrulaması gibi; fırlatabilir).
 */
export async function collectUnreadIds(
  listPage: (cursor: string | undefined) => Promise<Page<AppNotification>>,
  afterPage: () => void = () => undefined,
  maxPages: number = MAX_SWEEP_PAGES,
): Promise<string[]> {
  const unread: string[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  for (let pages = 0; pages < maxPages; pages += 1) {
    const page = await listPage(cursor);
    afterPage();
    for (const notification of page.items) if (!notification.read) unread.push(notification.id);
    if (page.nextCursor === null) return unread;
    if (seenCursors.has(page.nextCursor)) throw appError.unknown('notifications sweep: imleç tekrarı', 'unexpected');
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw appError.unknown(`notifications sweep: ${maxPages} sayfa sınırında bitiş imleci görülmedi`, 'unexpected');
}
