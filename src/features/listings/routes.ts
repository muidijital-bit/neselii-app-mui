import type { Href } from 'expo-router';

import { EMPTY_SEARCH, buildSearch, encodeSearchParam, initialDraftForCategory, type CategoryId, type ListingSearch } from '@/domain';

/**
 * Rota sözleşmesi. Gerçek ekranlar kendi görevlerinde aynı yola oturur:
 *  - filtre (009): `/filters?categoryId=<CategoryId>` — kategori seçimi `categoryId` taşır; parametre yoksa tüm kategoriler. Kategoriler sekmesi artık bu ara ekranı
 *    açmaz (027): `categoryResultsHref` doğrudan sonuçlara gider; `categoryId` parametresi yalnızca geriye uyumlu giriş olarak kalır.
 *  - detay (011): `/listings/<listingId>` — kart, `ListingSummary.id` ile açar (liste ve detay aynı kimliği kullanır).
 * İletişim/sohbet (013/014) hedefi geçici yer tutucudur; gerçek ID'yi taşırlar, akışları kendi görevlerinde tamamlanır.
 */
export const filtersHref = (categoryId?: CategoryId): Href => (categoryId ? { pathname: '/filters', params: { categoryId } } : '/filters');

/** Mevcut aramayı filtre ekranında yeniden düzenlemek için (010 "Filtre" çipi): `search` parametresi `categoryId`'den önceliklidir. */
export const filtersEditHref = (search: ListingSearch): Href => ({ pathname: '/filters', params: { search: encodeSearchParam(search) } });

export const listingHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]', params: { listingId } });
/** Galeri (012). İsteğe bağlı `index`, `ListingDetail.media` içindeki 0 tabanlı başlangıç sırasıdır. `/gallery` geliştirici bileşen galerisidir, bununla karışmaz. */
export const listingMediaHref = (listingId: string, index?: number): Href => ({
  pathname: '/listings/[listingId]/media',
  params: index === undefined ? { listingId } : { listingId, index: String(index) },
});
/** İlan için firma ile sohbet (013/014) geçici hedefi: kullanıcı+ilan başına tek sohbet orada oluşturulup açılır. */
export const listingContactHref = (listingId: string): Href => ({ pathname: '/listings/[listingId]/contact', params: { listingId } });

/**
 * Sonuç ekranı (010): normalize `ListingSearch` tek `search` parametresiyle (`encodeSearchParam`) taşınır; ekran `decodeSearchParam`
 * ile okur, eksik/geçersiz parametre `EMPTY_SEARCH`'e düşer. Filtre ekranının "Sonuçları Göster" eylemi ve ana sayfa arama
 * gönderimi bu yolu kullanır.
 */
export const resultsHref = (search: ListingSearch): Href => ({ pathname: '/results', params: { search: encodeSearchParam(search) } });

/**
 * Kategoriler sekmesi (027): kategori seçimi filtre ara ekranına uğramadan o kategorinin temiz aramasını açar. Arama yalnızca seçilen kategori
 * kimliğini taşır (metin/fiyat/şehir/durum/özel alan yok, varsayılan sıra); aynı normalize yol Filtre ekranının "Sonuçları Göster"i ile üretilir.
 */
export const categoryResultsHref = (categoryId: CategoryId): Href => {
  const built = buildSearch(initialDraftForCategory(categoryId));
  return resultsHref(built.ok ? built.search : EMPTY_SEARCH);
};
