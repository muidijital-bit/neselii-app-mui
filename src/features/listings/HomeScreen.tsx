import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon } from '@/components/icons/Icon';
import { useTabBarClearance } from '@/components/TabBar';
import { buildSearch, EMPTY_FILTER_DRAFT, EMPTY_SEARCH, userMessage } from '@/domain';
import { unreadBadgeText, useNotificationUnreadCountQuery } from '@/features/notifications';
import { FavoriteFailureNotice } from '@/features/saved/FavoriteFailureNotice';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { useSession } from '@/features/session/SessionProvider';
import { colors, fontFamily } from '@/theme';

import { callCompany } from './companyPhone';
import { HeroBackdrop } from './home/HeroBackdrop';
import { CallCard, FeaturedCarousel, FinancingPromo, NewArrivalsGrid, QuickFilters, quickFilterSearch, SectionHeader } from './home/HomeSections';
import { StateMessage } from './ListStates';
import { toCardModel } from './presentation';
import { filtersHref, listingHref, resultsHref } from './routes';
import { useCategoriesQuery, useFeaturedQuery, useListingCountQuery, useListingFeedQuery } from './useListingsQueries';

const FINANCING_SEARCH = (() => {
  const built = buildSearch({ ...EMPTY_FILTER_DRAFT, financing: true });
  return built.ok ? built.search : EMPTY_SEARCH;
})();

/** Ana sayfadaki "Yeni Gelenler" ızgarası (2 sütun × 2 satır). */
const NEW_ARRIVALS = 4;

/**
 * Ana sayfa (2. aşama): hareketli görsel arka planlı lacivert üst alan (selam, ilan sayısı, arama + turuncu filtre), hızlı filtreler,
 * taksit kampanyası, öne çıkan ilanlar karuseli, yeni gelenler ızgarası, tüm ilanlar düğmesi ve firma arama kartı. Sayılar ve listeler
 * canlı veriden gelir; yüzen sekme çubuğu içeriğin üstünde durduğundan alt boşluk bırakılır.
 */
export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const { session } = useSession();
  const [searchText, setSearchText] = useState('');
  const [heroHeight, setHeroHeight] = useState(0);
  const [pastHero, setPastHero] = useState(false);

  const categories = useCategoriesQuery();
  const featured = useFeaturedQuery();
  const feed = useListingFeedQuery(null);
  const financingCount = useListingCountQuery(FINANCING_SEARCH);
  const notificationsUnread = useNotificationUnreadCountQuery().data ?? 0;
  const favorites = useFavoriteToggle();
  // Göreli tarihler ekran açılışındaki saate göre hesaplanır (render saf kalır).
  const [nowMs] = useState(() => Date.now());

  const firstName = session?.user.fullName.trim().split(/\s+/)[0] ?? '';
  const total = categories.data?.reduce((sum, category) => sum + category.listingCount, 0) ?? null;
  const newest = useMemo(() => feed.data?.pages[0]?.items.slice(0, NEW_ARRIVALS) ?? [], [feed.data]);
  const featuredCards = useMemo(() => (featured.data ?? []).map((listing) => toCardModel(listing, nowMs)), [featured.data, nowMs]);
  const newestCards = useMemo(() => newest.map((listing) => toCardModel(listing, nowMs)), [newest, nowMs]);
  const backdropImages = useMemo(() => {
    const uris = [...(featured.data ?? []), ...(feed.data?.pages[0]?.items ?? [])].flatMap((listing) => (listing.coverImageUri ? [listing.coverImageUri] : []));
    return Array.from(new Set(uris)).slice(0, 20);
  }, [featured.data, feed.data]);

  const refreshing = categories.isRefetching || featured.isRefetching || feed.isRefetching;
  const refresh = () => {
    void categories.refetch();
    void featured.refetch();
    void feed.refetch();
    void financingCount.refetch();
  };

  const submitSearch = () => {
    const built = buildSearch({ ...EMPTY_FILTER_DRAFT, query: searchText });
    if (!built.ok || built.search.query === '') return;
    router.push(resultsHref(built.search));
  };

  // Üst alan kaydırılıp geçilince durum çubuğu simgeleri açık zemine göre koyulaşır.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = heroHeight > 0 && event.nativeEvent.contentOffset.y > heroHeight - insets.top;
    if (next !== pastHero) setPastHero(next);
  };

  const showAll = () => router.push(resultsHref(EMPTY_SEARCH));
  const openListing = (id: string) => router.push(listingHref(id));
  const toggleFavorite = (id: string) => favorites.toggle(id, [...(featured.data ?? []), ...newest].find((listing) => listing.id === id) ?? null);

  return (
    <View style={styles.root} testID="tab-screen-home">
      <StatusBar style={pastHero ? 'dark' : 'light'} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.white} progressViewOffset={insets.top} />}
        testID="home-list">
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]} onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
          <HeroBackdrop imageUris={backdropImages} />
          <View style={styles.brandRow}>
            <BrandLogo height={36} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={notificationsUnread > 0 ? `Bildirimler, ${notificationsUnread} okunmamış` : 'Bildirimler'}
              onPress={() => router.navigate('/notifications')}
              style={styles.bell}
              testID="home-notifications">
              <Icon name="bell" size={24} color={colors.white} />
              {notificationsUnread > 0 ? (
                <View style={styles.bellBadge} testID="home-notifications-badge">
                  <Text style={styles.bellBadgeText} allowFontScaling={false}>
                    {unreadBadgeText(notificationsUnread)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.hello} numberOfLines={1}>
              {firstName ? `Merhaba ${firstName},` : 'Merhaba,'}
            </Text>
            <Text style={styles.heroTitle} accessibilityRole="header">
              Aradığın aracı bul
            </Text>
            {total !== null ? (
              <View style={styles.liveRow} testID="home-count">
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{`${total} araç şu an satışta`}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.search}>
            <Icon name="search" size={22} color={colors.slate} />
            <TextInput
              accessibilityRole="search"
              accessibilityLabel="Marka, model veya ilan numarası ile ara"
              placeholder="Marka, model veya ilan no"
              placeholderTextColor={colors.slateFaint}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
              testID="home-search"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Filtrele" onPress={() => router.push(filtersHref())} style={styles.filterButton} testID="home-filter">
              <Icon name="sliders-vertical" size={22} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.sections}>
          <FavoriteFailureNotice message={favorites.failure} testID="home-favorite-failure" />

          <QuickFilters
            onSelect={(filter) => {
              const search = quickFilterSearch(filter);
              if (search) router.push(resultsHref(search));
            }}
          />

          <FinancingPromo count={financingCount.data ?? null} onPress={() => router.push(resultsHref(FINANCING_SEARCH))} />

          {featuredCards.length > 0 ? (
            <View>
              <SectionHeader title="Öne Çıkan İlanlar" onAll={showAll} testID="home-featured-header" />
              <FeaturedCarousel cards={featuredCards} onOpen={openListing} />
            </View>
          ) : null}

          <View>
            <SectionHeader title="Yeni Gelenler" onAll={showAll} testID="home-new-header" />
            {feed.isError ? (
              <StateMessage icon="info" title="İlanlar yüklenemedi" message={userMessage(feed.error)} actionLabel="Tekrar dene" onAction={() => void feed.refetch()} testID="home-error" />
            ) : feed.isPending ? (
              <View style={styles.gridSkeleton} testID="home-loading">
                {Array.from({ length: NEW_ARRIVALS }, (_, index) => (
                  <View key={index} style={styles.skeletonCard} />
                ))}
              </View>
            ) : newestCards.length === 0 ? (
              <StateMessage icon="search-x" title="Henüz ilan yok" message="Şu an yayında ilan bulunmuyor. Daha sonra tekrar bakın." testID="home-empty" />
            ) : (
              <NewArrivalsGrid cards={newestCards} isFavorite={favorites.isFavorite} onToggleFavorite={toggleFavorite} onOpen={openListing} />
            )}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Tüm ilanları gör" onPress={showAll} style={({ pressed }) => [styles.allButton, pressed && styles.allButtonPressed]} testID="home-all-listings">
            <Icon name="arrow-right" size={22} color={colors.white} />
            <Text style={styles.allButtonText}>{total !== null ? `Tüm ilanları gör (${total})` : 'Tüm ilanları gör'}</Text>
          </Pressable>

          <CallCard onCall={() => callCompany((message) => Alert.alert('Hemen Ara', message))} />
        </View>
      </ScrollView>
    </View>
  );
}

const H_PAD = 16;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: {
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: H_PAD,
    paddingBottom: 28,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  bellBadgeText: { color: colors.white, fontFamily: fontFamily.inter700, fontSize: 10, lineHeight: 12 },
  greeting: { marginTop: 44, gap: 6 },
  hello: { fontFamily: fontFamily.inter400, fontSize: 17, color: colors.bluePale },
  heroTitle: { fontFamily: fontFamily.montserrat800, fontSize: 30, lineHeight: 36, color: colors.white },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greenBright },
  liveText: { fontFamily: fontFamily.inter500, fontSize: 15, color: colors.white },
  search: {
    marginTop: 26,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    gap: 10,
  },
  searchInput: { flex: 1, height: 60, fontFamily: fontFamily.inter400, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  filterButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  sections: { paddingTop: 20, gap: 28 },
  gridSkeleton: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: H_PAD, rowGap: 16 },
  skeletonCard: { width: '48%', height: 236, borderRadius: 20, backgroundColor: colors.lineSoft },
  allButton: {
    marginHorizontal: H_PAD,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  allButtonPressed: { backgroundColor: colors.navyRaised },
  allButtonText: { fontFamily: fontFamily.inter700, fontSize: 17, color: colors.white },
});
