import type { ListingSearch } from './filters';
import { foldForSearch } from './format';
import { searchChips, searchTitle } from './searchChips';

/** Kayıtlı arama adı üst sınırı (karakter). Otomatik ad bunu aşarsa `…` ile kısaltılır. */
export const SAVED_SEARCH_TITLE_MAX = 80;

const SET_KEYS = new Set(['categories', 'statuses', 'driveConfigs', 'axles', 'rooms']);

/** Anahtarları sıralı, küme alanları (kategori, durum, çekiş, aks, oda) sıra bağımsız kanonik biçim; `undefined` alanlar atlanır. */
function canonical(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => canonical(item));
    return key !== undefined && SET_KEYS.has(key) ? items.sort((a, b) => String(a).localeCompare(String(b))) : items;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([childKey, child]) => [childKey, canonical(child, childKey)]),
    );
  }
  return value;
}

/**
 * Aramanın kimliği: aynı metin (büyük/küçük harf ve Türkçe karakter farkı gözetmez) + aynı filtre kümesi + aynı sıra → aynı anahtar.
 * Kayıtlı aramanın "zaten kayıtlı mı" kararı ve mükerrer önleme bununla yapılır; kategori sırası fark yaratmaz.
 */
export function searchKey(search: ListingSearch): string {
  return JSON.stringify(canonical({ ...search, query: foldForSearch(search.query) }));
}

/**
 * Kayıt için varsayılan ad: etkin çiplerin etiketleri ` · ` ile (ör. `Mercedes-Benz · 2018+ · Çekici`); koşul yoksa sonuç başlığı
 * (`Tüm İlanlar`). Her zaman boş olmayan ve `SAVED_SEARCH_TITLE_MAX` karakteri aşmayan metin döner.
 */
export function savedSearchTitle(search: ListingSearch): string {
  const labels = searchChips(search).map((chip) => chip.label);
  const title = labels.length > 0 ? labels.join(' · ') : searchTitle(search);
  return title.length > SAVED_SEARCH_TITLE_MAX ? `${title.slice(0, SAVED_SEARCH_TITLE_MAX - 1).trimEnd()}…` : title;
}

/** Ad kuralı (servis + gelecekteki form aynı iletiyi kullanır): kırpılmış, boş değil, en çok `SAVED_SEARCH_TITLE_MAX`. */
export function savedSearchTitleError(title: string): string | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) return 'Arama adı boş olamaz.';
  if (trimmed.length > SAVED_SEARCH_TITLE_MAX) return `Arama adı en fazla ${SAVED_SEARCH_TITLE_MAX} karakter olmalı.`;
  return null;
}
