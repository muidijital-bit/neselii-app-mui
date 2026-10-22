import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
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
import { FavoriteFailureNotice, Notice } from '@/features/saved/FavoriteFailureNotice';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { useSavedSearchToggle } from '@/features/saved/useSavedSearches';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingCard } from '@/ui/ListingCard';
import { enterFadeUp, useEntranceWindow } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { ListScreenHeader } from './ListScreenHeader';
import { ListingSkeletons, StatePanel, type StateAction } from './ListStates';
import { toListingView } from './presentation';
import { filtersEditHref, listingHref } from './routes';
import { flattenUniquePages, useListingCountQuery, useSearchResultsQuery } from './useListingsQueries';

/** Yakınlık sırasında en çok kaç sayfa (20'şer) otomatik yüklenir; sıralama yüklenen ilanlar üzerinde cihazda yapılır. */
const MAX_PROXIMITY_PAGES = 25;

const NEARBY_OPTION_LABEL = 'Önce yakındakiler';

/** İlk sayfada giriş animasyonu alan kart sayısı (ekrana ilk sığanlar); sonsuz kaydırmayla gelenler animasyonsuz. */
const ANIMATED_CARDS = 4;

// Main'deki sıralama adları (`sortLabels`).
const SORT_OPTIONS: readonly { value: ListingSort; label: string }[] = [
  { value: 'newest', label: 'Önce en yeni' },
  { value: 'price-asc', label: 'Fiyat: düşükten yükseğe' },
  { value: 'price-desc', label: 'Fiyat: yüksekten düşüğe' },
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
  return (
    <>
      <FocusStatusBar style="dark" />
      <ResultsBody key={encodeSearchParam(search)} search={search} nearby={nearby} onChange={(next) => router.setParams({ search: encodeSearchParam(next) })} />
    </>
  );
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
  const sortOptions = nearest ? SORT_OPTIONS.map((option) => (option.value === 'newest' ? { ...option, label: NEARBY_OPTION_LABEL } : option)) : SORT_OPTIONS;
  const chips = searchChips(search);
  const filterCount = activeFilterCount(search);
  const sortLabel = sortOptions.find((option) => option.value === search.sort)?.label ?? sortOptions[0].label;

  const loaded = results.isSuccess && !preparing;
  const hasMore = results.hasNextPage;
  // Toplam sayı sayım sorgusundan gelir ("94 ilan bulundu"); gelene kadar yüklenen sayı "+" ile alt sınır olarak gösterilir.
  const total = countQuery.data;
  const countLabel = loaded ? (total !== undefined ? String(total) : hasMore ? `${items.length}+` : String(items.length)) : null;

  const loadMore = useCallback(() => {
    if (results.hasNextPage && !results.isFetchingNextPage && !results.isFetchNextPageError) void results.fetchNextPage();
  }, [results]);

  // Gösterge yalnız kullanıcı çektiğinde (ekrana dönüşte bayat sonuçların arka plan yeniden çekmesi göstergeyi açmaz).
  const { pulling, onRefresh } = usePullRefresh(results.refetch);
  const entering = useEntranceWindow(items.length > 0);

  const save = savedSearch.toggle;
  const saved = savedSearch.saved !== null;
  const priceChip = chips.find((chip) => chip.id.kind === 'price');

  let empty = null;
  if (preparing && !(items.length === 0 && results.isError)) {
    empty = <ListingSkeletons testID="results-loading" />;
  } else if (items.length === 0 && results.isError) {
    empty = (
      <StatePanel
        icon="wifi-off"
        title="İlanlar yüklenemedi"
        message={userMessage(results.error)}
        actions={[{ title: 'Tekrar dene', onPress: () => void results.refetch(), testID: 'results-error-action' }]}
        testID="results-error"
      />
    );
  } else {
    const hasFilters = filterCount > 0;
    const clearAction: StateAction = priceChip
      ? { title: 'Fiyat filtresini kaldır', variant: 'outline', onPress: () => onChange(removeChip(search, priceChip.id)), testID: 'results-empty-remove-price' }
      : hasFilters
        ? { title: 'Filtreleri temizle', variant: 'outline', onPress: () => onChange({ ...search, filters: EMPTY_FILTERS }), testID: 'results-empty-clear' }
        : { title: 'Aramayı temizle', variant: 'outline', onPress: () => onChange({ ...search, query: '' }), testID: 'results-empty-clear' };
    empty = (
      <StatePanel
        top
        icon="mci:magnify-close"
        title={hasFilters ? 'Bu filtrelerle ilan bulunamadı' : 'Aramanızla eşleşen ilan bulunamadı'}
        message={hasFilters ? 'Fiyat aralığını genişletmeyi veya bazı filtreleri kaldırmayı deneyin.' : 'Farklı bir kelime deneyin veya filtreleri kullanarak aramayı daraltın.'}
        actions={[
          clearAction,
          {
            title: saved ? 'Kayıtlı Aramadan Çıkar' : 'Aramayı Kaydet',
            icon: saved ? 'mci:bell-off-outline' : 'mci:bell-plus-outline',
            variant: saved ? 'outline' : 'primary',
            loading: savedSearch.busy,
            onPress: save,
            testID: 'results-empty-save',
          },
        ]}
        testID="results-empty">
        {saveNotice ? (
          <View style={styles.emptyNotice}>
            <Notice alert testID="results-save-notice-empty">
              {saveNotice}
            </Notice>
          </View>
        ) : null}
      </StatePanel>
    );
  }

  const header =
    items.length > 0 || favorites.failure ? (
      <View style={styles.listHeader}>
        {saveNotice && items.length > 0 ? (
          <Notice alert testID="results-save-notice">
            {saveNotice}
          </Notice>
        ) : null}
        <FavoriteFailureNotice message={favorites.failure} testID="results-favorite-failure" />
        {items.length > 0 ? (
          <View style={styles.resultBar}>
            <Text variant="bodyMedium" color="textSecondary" accessibilityLiveRegion="polite" testID="results-count">
              {countLabel} sonuç
            </Text>
            <Pressable
              style={styles.sort}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Sıralama: ${sortLabel}`}
              accessibilityState={{ expanded: sortOpen }}
              onPress={() => setSortOpen(true)}
              testID="results-sort">
              <Icon name="mci:swap-vertical" size={22} />
              <Text variant="bodyMedium" color="heading">
                {sortLabel}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {items.length > 0 && (nearest || mode === 'fallback') ? <NearbyNotice nearest={nearest} onOpenPreferences={() => router.push('/notification-preferences')} /> : null}
      </View>
    ) : null;

  const footer =
    results.isFetchingNextPage || results.isFetchNextPageError ? (
      <View style={styles.footer}>
        {results.isFetchingNextPage ? <ActivityIndicator color={Colors.navy} testID="results-next-loading" accessibilityLabel="Daha fazla ilan yükleniyor" /> : null}
        {results.isFetchNextPageError ? (
          <View style={styles.nextError} testID="results-next-error">
            <Text variant="small" align="center">
              {userMessage(results.error)}
            </Text>
            <Button title="Tekrar dene" variant="outline" onPress={() => void results.fetchNextPage()} style={styles.nextRetry} testID="results-next-retry" />
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={styles.container} testID="results-screen">
      <ListScreenHeader
        title={searchTitle(search)}
        subtitle={countLabel !== null ? `${countLabel} ilan bulundu` : 'Yükleniyor…'}
        backTestID="results-back"
        titleTestID="results-title"
        subtitleTestID="results-subtitle"
        right={
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Kayıtlı aramadan çıkar' : 'Aramayı kaydet'}
            accessibilityState={{ selected: saved, busy: savedSearch.busy }}
            disabled={savedSearch.busy}
            onPress={save}
            style={styles.bell}
            testID="results-save">
            {savedSearch.busy ? (
              <ActivityIndicator size="small" color={Colors.navy} testID="results-save-busy" />
            ) : (
              <Icon name={saved ? 'mci:bell-check' : 'mci:bell-plus-outline'} size={28} color={saved ? 'green' : 'heading'} />
            )}
          </Pressable>
        }>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled" testID="results-chips">
          <Pressable
            style={styles.filterChip}
            onPress={() => router.push(filtersEditHref(search))}
            accessibilityRole="button"
            accessibilityLabel={`Filtre, ${filterCount} etkin`}
            testID="results-filter">
            <Icon name="sliders" size={20} color="white" />
            <Text variant="bodyMedium" style={styles.white}>
              Filtre · {filterCount}
            </Text>
          </Pressable>
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              style={styles.queryChip}
              onPress={() => onChange(removeChip(search, chip.id))}
              accessibilityRole="button"
              accessibilityLabel={`${chip.label} filtresini kaldır`}
              testID={`results-chip-${chip.key}`}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.queryText}>
                {chip.label}
              </Text>
              <Icon name="x" size={18} color="textSecondary" />
            </Pressable>
          ))}
        </ScrollView>
      </ListScreenHeader>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => item.id}
        extraData={favorites}
        renderItem={({ item, index }) => (
          <Animated.View entering={entering && index < ANIMATED_CARDS ? enterFadeUp(index) : undefined}>
            <ListingCard
              listing={toListingView(item)}
              isFavorite={favorites.isFavorite(item.id)}
              onToggleFavorite={() => favorites.toggle(item.id, item)}
              onPress={() => router.push(listingHref(item.id))}
              testID={`listing-card-${item.id}`}
            />
          </Animated.View>
        )}
        ListHeaderComponent={header ?? undefined}
        ListEmptyComponent={empty}
        ListFooterComponent={footer ?? undefined}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="results-list"
      />

      <SortSheet
        visible={sortOpen}
        options={sortOptions}
        selected={search.sort}
        onSelect={(sort) => {
          if (sort !== search.sort) onChange({ ...search, sort });
        }}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

/** Main'deki `OptionSheet` (alttan açılan "Sıralama" listesi) — Maestro testID'leriyle birebir kopya. */
function SortSheet({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: readonly { value: ListingSort; label: string }[];
  selected: ListingSort;
  onSelect: (sort: ListingSort) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]} accessibilityRole="menu" testID="results-sort-menu">
        <View style={styles.grabber} />
        <Text variant="subheading" style={styles.sheetTitle}>
          Sıralama
        </Text>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              testID={`results-sort-${option.value}`}>
              <Text variant={isSelected ? 'bodySemibold' : 'body'} style={styles.flex}>
                {option.label}
              </Text>
              {isSelected ? <Icon name="check" size={20} color="green" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

/** Yakınlık sırasının durumu: aktifse bilgi; tercih açık ama izin/koordinat yoksa en yeni sıranın nedeni + tercihlere bağlantı. */
function NearbyNotice({ nearest, onOpenPreferences }: { nearest: boolean; onOpenPreferences: () => void }) {
  return (
    <Notice icon="map-pin" testID={nearest ? 'results-nearby-active' : 'results-nearby-fallback'}>
      {nearest ? 'Konumunuza yakın ilanlar önce gösteriliyor. Konumunuz yalnızca bu cihazda kullanılır.' : 'Konum izni verilmediği ya da konum alınamadığı için en yeni ilanlar önce gösteriliyor. '}
      {nearest ? null : (
        <Text variant="smallSemibold" color="heading" style={styles.link} accessibilityRole="link" onPress={onOpenPreferences} testID="results-nearby-preferences">
          Tercihleri aç
        </Text>
      )}
    </Notice>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  white: { color: Colors.white },
  bell: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: Spacing.two },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.navy,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    height: 46,
  },
  queryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.four,
    height: 46,
    maxWidth: 280,
  },
  queryText: { flexShrink: 1 },
  list: { flex: 1 },
  // Main'deki `ListingList`: 16 kenar boşluğu, kartlar arası 16.
  listContent: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  listHeader: { gap: Spacing.three },
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  link: { textDecorationLine: 'underline' },
  emptyNotice: { alignSelf: 'stretch' },
  footer: { alignItems: 'center', paddingVertical: Spacing.two, gap: Spacing.two },
  nextError: { alignSelf: 'stretch', gap: Spacing.two },
  nextRetry: { minWidth: 200, alignSelf: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,33,63,0.45)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.disabled,
    marginBottom: Spacing.two,
  },
  sheetTitle: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.background },
});
