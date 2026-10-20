import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Chip } from '@/components/Chip';
import { ListingCardLarge } from '@/components/ListingCardLarge';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import {
  AppError,
  EMPTY_FILTERS,
  EMPTY_SEARCH,
  activeFilterCount,
  decodeSearchParam,
  encodeSearchParam,
  removeChip,
  searchChips,
  searchTitle,
  sortByProximity,
  userMessage,
  type ListingSearch,
  type ListingSort,
} from '@/domain';
import { useNearbyOrigin, type NearbyOrigin } from '@/features/preferences';
import { FavoriteFailureNotice } from '@/features/saved/FavoriteFailureNotice';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { useSavedSearchToggle } from '@/features/saved/useSavedSearches';
import { colors, fontFamily, radii, sizes, spacing, textStyles } from '@/theme';

import { ListingSkeletons, StateMessage } from './ListStates';
import { toCardModel } from './presentation';
import { filtersEditHref, listingHref } from './routes';
import { flattenUniquePages, useListingCountQuery, useSearchResultsQuery } from './useListingsQueries';

/** Yakınlık sırasında en çok kaç sayfa (20'şer) otomatik yüklenir; sıralama yüklenen ilanlar üzerinde cihazda yapılır. */
const MAX_PROXIMITY_PAGES = 25;

const NEARBY_OPTION_LABEL = 'Önce yakındakiler';

const SORT_OPTIONS: readonly { value: ListingSort; label: string; short: string }[] = [
  { value: 'newest', label: 'Önce en yeni', short: 'Önce en yeni' },
  { value: 'price-asc', label: 'Fiyat: düşükten yükseğe', short: 'Fiyat artan' },
  { value: 'price-desc', label: 'Fiyat: yüksekten düşüğe', short: 'Fiyat azalan' },
];

/**
 * Arama sonuçları (06) ve sonuç yok (06b). Tek kaynak `search` rota parametresidir (`resultsHref`); eksik/geçersizse güvenli `EMPTY_SEARCH`.
 * Çip silme ve sıra değişimi aynı rotanın parametresini günceller (`setParams`): sorgu anahtarı değişir, yeni ekran birikmez.
 */
export function ResultsScreen() {
  const router = useRouter();
  const { search: raw } = useLocalSearchParams<{ search?: string }>();
  const search = useMemo(() => decodeSearchParam(raw) ?? EMPTY_SEARCH, [raw]);
  // Yakınlık girdisi (tercih + sistem izni + cihaz koordinatı) arama değişiminde yeniden kurulan gövdenin DIŞINDA tutulur: koordinat bellekte yalnızca
  // bu ekran açıkken yaşar, her arama/sıra değişiminde yeniden okunmaz ve hiçbir yere (servis, rota parametresi, sorgu anahtarı) yazılmaz.
  const nearby = useNearbyOrigin(search.sort === 'newest');
  return <ResultsBody key={encodeSearchParam(search)} search={search} nearby={nearby} onChange={(next) => router.setParams({ search: encodeSearchParam(next) })} />;
}

function ResultsBody({ search, nearby, onChange }: { search: ListingSearch; nearby: NearbyOrigin; onChange: (next: ListingSearch) => void }) {
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  const results = useSearchResultsQuery(search);
  const favorites = useFavoriteToggle();
  const savedSearch = useSavedSearchToggle(search);
  const saveNotice = savedSearch.notice;

  const loadedItems = useMemo(() => flattenUniquePages(results.data?.pages), [results.data]);

  // Yakınlık sırası: yalnızca varsayılan sıra ("en yeni") seçiliyken ve tercih+izin+koordinat varken; kullanıcı fiyat sırasını seçtiyse o korunur.
  // Servise yalnızca arama gider (koordinat gitmez); sıralama yüklenen ilanlar üzerinde cihazda yapılır, bu yüzden tüm sayfalar gelene dek liste hazırlanır.
  const proximityAvailable = search.sort === 'newest';
  const mode = proximityAvailable ? nearby.mode : 'off';
  const origin = mode === 'nearest' ? nearby.origin : null;
  const awaitingOrder = proximityAvailable && nearby.locating;
  const pageCount = results.data?.pages.length ?? 0;
  const assembling = origin !== null && !results.isFetchNextPageError && (results.hasNextPage || results.isFetchingNextPage) && pageCount < MAX_PROXIMITY_PAGES;
  const preparing = results.isPending || awaitingOrder || assembling;
  const nearest = origin !== null && !awaitingOrder;
  const items = useMemo(() => (preparing ? [] : nearest ? sortByProximity(loadedItems, origin) : loadedItems), [preparing, nearest, origin, loadedItems]);

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = results;
  useEffect(() => {
    if (origin !== null && hasNextPage && !isFetchingNextPage && !isFetchNextPageError && pageCount < MAX_PROXIMITY_PAGES) void fetchNextPage();
  }, [origin, hasNextPage, isFetchingNextPage, isFetchNextPageError, pageCount, fetchNextPage]);

  const countQuery = useListingCountQuery(search);
  const sortOptions = nearest ? SORT_OPTIONS.map((option) => (option.value === 'newest' ? { ...option, label: NEARBY_OPTION_LABEL, short: NEARBY_OPTION_LABEL } : option)) : SORT_OPTIONS;
  const chips = searchChips(search);
  const filterCount = activeFilterCount(search);
  const nowMs = Date.now();
  const sortLabel = sortOptions.find((option) => option.value === search.sort)?.short ?? sortOptions[0].short;

  const loaded = results.isSuccess && !preparing;
  const hasMore = results.hasNextPage;
  // Toplam sayı sayım sorgusundan gelir (2. aşama: "94 ilan bulundu"); gelene kadar yüklenen sayı "+" ile alt sınır olarak gösterilir.
  const total = countQuery.data;
  const countLabel = loaded ? (total !== undefined ? String(total) : hasMore ? `${items.length}+` : String(items.length)) : null;

  const loadMore = useCallback(() => {
    if (results.hasNextPage && !results.isFetchingNextPage && !results.isFetchNextPageError) void results.fetchNextPage();
  }, [results]);

  const save = savedSearch.toggle;
  const saved = savedSearch.saved !== null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const priceChip = chips.find((chip) => chip.id.kind === 'price');

  let empty = null;
  if (preparing && !(items.length === 0 && results.isError)) {
    empty = <ListingSkeletons testID="results-loading" />;
  } else if (items.length === 0 && results.isError) {
    const offline = results.error instanceof AppError && results.error.kind === 'offline';
    empty = (
      <StateMessage
        icon="info"
        title={offline ? 'Bağlantı yok' : 'Sonuçlar yüklenemedi'}
        message={userMessage(results.error)}
        actionLabel="Tekrar dene"
        onAction={() => void results.refetch()}
        testID="results-error"
      />
    );
  } else {
    const hasFilters = filterCount > 0;
    empty = (
      <View style={styles.empty} testID="results-empty">
        <View style={styles.emptyIcon}>
          <Icon name="search-x" size={32} color={colors.blue} />
        </View>
        <Text style={[textStyles.titlePage, styles.emptyTitle]} accessibilityRole="header">
          {hasFilters ? 'Bu filtrelerle ilan bulunamadı' : 'Aramanızla eşleşen ilan bulunamadı'}
        </Text>
        <Text style={[textStyles.bodySmall, styles.emptyMessage]}>
          {hasFilters ? 'Fiyat aralığını genişletmeyi veya bazı filtreleri kaldırmayı deneyin.' : 'Farklı bir kelime deneyin veya filtreleri kullanarak aramayı daraltın.'}
        </Text>
        <View style={styles.emptyActions}>
          {priceChip ? (
            <Btn label="Fiyat filtresini kaldır" variant="secondary" onPress={() => onChange(removeChip(search, priceChip.id))} testID="results-empty-remove-price" />
          ) : hasFilters ? (
            <Btn label="Filtreleri temizle" variant="secondary" onPress={() => onChange({ ...search, filters: EMPTY_FILTERS })} testID="results-empty-clear" />
          ) : (
            <Btn label="Aramayı temizle" variant="secondary" onPress={() => onChange({ ...search, query: '' })} testID="results-empty-clear" />
          )}
          <Btn
            label={saved ? 'Kayıtlı Aramadan Çıkar' : 'Aramayı Kaydet'}
            variant={saved ? 'secondary' : 'primary'}
            icon={saved ? 'bell-ring' : 'bell-plus'}
            loading={savedSearch.busy}
            onPress={save}
            testID="results-empty-save"
          />
        </View>
        {saveNotice ? <SaveNotice message={saveNotice} testID="results-save-notice-empty" /> : null}
      </View>
    );
  }

  const header = (
    <View style={styles.listHeader}>
      {saveNotice && items.length > 0 ? <SaveNotice message={saveNotice} testID="results-save-notice" /> : null}
      <FavoriteFailureNotice message={favorites.failure} testID="results-favorite-failure" />
      {items.length > 0 ? (
        <View style={styles.countRow}>
          <Text style={styles.count} accessibilityLiveRegion="polite" testID="results-count">
            {countLabel} sonuç
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sıralama: ${sortLabel}`}
            accessibilityState={{ expanded: sortOpen }}
            onPress={() => setSortOpen((open) => !open)}
            style={styles.sortButton}
            testID="results-sort">
            <Icon name="arrow-up-down" size={16} color={colors.blue} />
            <Text style={styles.sortText}>{sortLabel}</Text>
          </Pressable>
        </View>
      ) : null}
      {items.length > 0 && (nearest || mode === 'fallback') ? <NearbyNotice nearest={nearest} onOpenPreferences={() => router.push('/notification-preferences')} /> : null}
      {sortOpen && items.length > 0 ? (
        <View style={styles.sortMenu} accessibilityRole="menu" testID="results-sort-menu">
          {sortOptions.map((option) => {
            const selected = option.value === search.sort;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => {
                  setSortOpen(false);
                  if (!selected) onChange({ ...search, sort: option.value });
                }}
                style={styles.sortOption}
                testID={`results-sort-${option.value}`}>
                <Text style={[styles.sortOptionText, selected && styles.sortOptionSelected]}>{option.label}</Text>
                {selected ? <Icon name="check" size={18} color={colors.green} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {results.isFetchingNextPage ? <ActivityIndicator color={colors.blue} testID="results-next-loading" accessibilityLabel="Daha fazla ilan yükleniyor" /> : null}
      {results.isFetchNextPageError ? (
        <View style={styles.nextError} testID="results-next-error">
          <Text style={[textStyles.bodySmall, styles.nextErrorText]}>{userMessage(results.error)}</Text>
          <Btn label="Tekrar dene" variant="secondary" onPress={() => void results.fetchNextPage()} style={styles.nextRetry} testID="results-next-retry" />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right']} testID="results-screen">
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={back} style={styles.iconButton} testID="results-back">
            <Icon name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'} size={Platform.OS === 'ios' ? 26 : 24} color={colors.navy} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header" testID="results-title">
              {searchTitle(search)}
            </Text>
            {countLabel !== null ? (
              <Text style={styles.subtitle} testID="results-subtitle">
                {countLabel} ilan bulundu
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Kayıtlı aramadan çıkar' : 'Aramayı kaydet'}
            accessibilityState={{ selected: saved, busy: savedSearch.busy }}
            disabled={savedSearch.busy}
            onPress={save}
            style={styles.iconButton}
            testID="results-save">
            {savedSearch.busy ? <ActivityIndicator size="small" color={colors.navy} testID="results-save-busy" /> : <Icon name={saved ? 'bell-ring' : 'bell-plus'} size={22} color={saved ? colors.green : colors.navy} />}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll} keyboardShouldPersistTaps="handled" testID="results-chips">
          <Chip label={`Filtre · ${filterCount}`} icon="sliders-horizontal" selected onPress={() => router.push(filtersEditHref(search))} testID="results-filter" />
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              removable
              accessibilityLabel={`${chip.label} filtresini kaldır`}
              onPress={() => onChange(removeChip(search, chip.id))}
              testID={`results-chip-${chip.key}`}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => item.id}
        extraData={favorites}
        renderItem={({ item }) => {
          const card = toCardModel(item, nowMs);
          return (
            <ListingCardLarge
              card={card}
              favorite={favorites.isFavorite(card.id)}
              favoriteBusy={favorites.isPending(card.id)}
              onToggleFavorite={() => favorites.toggle(card.id, item)}
              onPress={() => router.push(listingHref(card.id))}
              testID={`listing-card-${card.id}`}
            />
          );
        }}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        testID="results-list"
      />
    </Screen>
  );
}

/** Yakınlık sırasının durumu: aktifse bilgi; tercih açık ama izin/koordinat yoksa en yeni sıranın nedeni + tercihlere bağlantı. */
function NearbyNotice({ nearest, onOpenPreferences }: { nearest: boolean; onOpenPreferences: () => void }) {
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite" testID={nearest ? 'results-nearby-active' : 'results-nearby-fallback'}>
      <Icon name="map-pin" size={18} color={colors.blue} />
      <Text style={styles.noticeText}>
        {nearest ? 'Konumunuza yakın ilanlar önce gösteriliyor. Konumunuz yalnızca bu cihazda kullanılır.' : 'Konum izni verilmediği ya da konum alınamadığı için en yeni ilanlar önce gösteriliyor. '}
        {nearest ? null : (
          <Text style={styles.noticeLink} accessibilityRole="link" onPress={onOpenPreferences} testID="results-nearby-preferences">
            Tercihleri aç
          </Text>
        )}
      </Text>
    </View>
  );
}

function SaveNotice({ message, testID }: { message: string; testID: string }) {
  return (
    <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID={testID}>
      <Icon name="info" size={18} color={colors.blue} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  top: { backgroundColor: colors.white },
  titleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  iconButton: { width: sizes.minTouchTarget, height: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: fontFamily.montserrat700, fontSize: 17, lineHeight: 19, color: colors.navy },
  subtitle: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 14, color: colors.slateLight },
  chipScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  chipRow: { flexDirection: 'row', gap: spacing.md, paddingTop: 2, paddingBottom: 12, paddingHorizontal: spacing.xl },
  list: { flex: 1, backgroundColor: colors.surface },
  listContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: spacing.xl },
  listHeader: { gap: 10, marginBottom: 10 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  count: { fontFamily: fontFamily.inter600, fontSize: 13, color: colors.inkSoft },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  sortText: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.blue },
  sortMenu: { backgroundColor: colors.white, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  sortOption: { minHeight: sizes.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  sortOptionText: { fontFamily: fontFamily.inter500, fontSize: 15, color: colors.ink },
  sortOptionSelected: { fontFamily: fontFamily.inter700, color: colors.navy },
  separator: { height: 16 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  noticeText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
  noticeLink: { fontFamily: fontFamily.inter600, textDecorationLine: 'underline' },
  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing['3xl'], gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: radii.pill, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.navy, textAlign: 'center', marginTop: 4 },
  emptyMessage: { color: colors.slate, textAlign: 'center' },
  emptyActions: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
  footer: { alignItems: 'center', paddingTop: spacing.lg, gap: spacing.md },
  nextError: { alignSelf: 'stretch', gap: spacing.md },
  nextErrorText: { color: colors.slate, textAlign: 'center' },
  nextRetry: { maxWidth: 240, alignSelf: 'center' },
});
