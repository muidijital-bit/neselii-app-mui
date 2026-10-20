import type { MediaItem } from '@/domain';

/** Başlangıç indeksi (0 tabanlı) rota parametresinden gelir; eksik, dizi, tamsayı olmayan veya aralık dışı değer 0'dır. */
export function parseStartIndex(param: string | string[] | undefined, length: number): number {
  if (typeof param !== 'string' || !/^\d{1,6}$/.test(param)) return 0;
  const index = Number(param);
  return index < length ? index : 0;
}

export type GalleryEntry = {
  readonly item: MediaItem;
  /** 0 tabanlı sıra (ListingDetail.media sırası). */
  readonly index: number;
  /** Fotoğraflar için 1 tabanlı fotoğraf sırası; video için `null`. */
  readonly photoNumber: number | null;
};

export function toGalleryEntries(media: readonly MediaItem[]): readonly GalleryEntry[] {
  let photos = 0;
  return media.map((item, index) => ({ item, index, photoNumber: item.kind === 'photo' ? ++photos : null }));
}

/** Üst çubuk sayacı: fotoğrafta "n / toplam" (toplam yalnızca fotoğraflar), videoda "Video". */
export function counterLabel(entry: GalleryEntry, entries: readonly GalleryEntry[]): string {
  if (entry.photoNumber === null) return 'Video';
  return `${entry.photoNumber} / ${entries.filter((e) => e.photoNumber !== null).length}`;
}

/** Seçili medya kimliği yoksa (liste değişti) ilkine düşer; boş listede `null`. */
export function resolveSelected(entries: readonly GalleryEntry[], selectedId: string | null): GalleryEntry | null {
  return entries.find((e) => e.item.id === selectedId) ?? entries[0] ?? null;
}
