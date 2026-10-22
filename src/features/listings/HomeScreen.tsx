import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { buildSearch, EMPTY_FILTER_DRAFT, EMPTY_SEARCH, type ListingSearch } from '@/domain';
import { useNotificationUnreadCountQuery } from '@/features/notifications';
import { FavoriteFailureNotice } from '@/features/saved/FavoriteFailureNotice';
import { useFavoriteToggle } from '@/features/saved/useFavorites';
import { useSession } from '@/features/session/SessionProvider';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { FeaturedCarousel } from '@/ui/home/FeaturedCarousel';
import { HomeHero } from '@/ui/home/Hero';
import { ListingTile } from '@/ui/home/ListingTile';
import { PromoBanner } from '@/ui/home/PromoBanner';
import { QuickActions } from '@/ui/home/QuickActions';
import { Icon } from '@/ui/Icon';
import { enterFade, enterFadeUp } from '@/ui/motion';
import { StateView } from '@/ui/StateView';
import { useTabBarSpace } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { callCompany } from './companyPhone';
import { quickActionSearch } from './home/quickActionSearch';
import { toListingView } from './presentation';
import { filtersHref, listingHref, resultsHref } from './routes';
import { useCategoriesQuery, useFeaturedQuery, useListingCountQuery, useListingFeedQuery, usePhotoWallQuery } from './useListingsQueries';

const buildOrEmpty = (patch: Partial<typeof EMPTY_FILTER_DRAFT>): ListingSearch => {
  const built = buildSearch({ ...EMPTY_FILTER_DRAFT, ...patch });
  return built.ok ? built.search : EMPTY_SEARCH;
};

const FINANCING_SEARCH = buildOrEmpty({ financing: true });
/** Vitrin "Tümü": main'deki gibi en pahalıdan ucuza. */
const PRICE_DESC_SEARCH = buildOrEmpty({ sort: 'price-desc' });

/** "Yeni Gelenler" ızgarasındaki ilan sayısı (2 sütun × 5 satır). */
const GRID_SIZE = 10;
/** Öne çıkan ilan yokken vitrine konan fotoğraflı en yeni ilan sayısı (main ile aynı). */
const FEATURED_FALLBACK = 8;

/**
 * Ana sayfa (main tasarımı): akan fotoğraf duvarlı lacivert üst alan (selam, ilan sayısı, arama + filtre), hızlı kısayollar, taksit
 * kampanyası, öne çıkan vitrin, yeni gelenler ızgarası ve firma arama kartı. Sayılar ve listeler canlı veriden gelir; yüzen sekme
 * çubuğu içeriğin üstünde durduğundan alt boşluk bırakılır.
 */
export function HomeScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const { session } = useSession();
  const [heroHeight, setHeroHeight] = useState(0);
  const [pastHero, setPastHero] = useState(false);

  const categories = useCategoriesQuery();
  const featured = useFeaturedQuery();
  const latest = useListingFeedQuery(null);
  const financingCount = useListingCountQuery(FINANCING_SEARCH);
  const photoWall = usePhotoWallQuery();
  const unread = useNotificationUnreadCountQuery().data ?? 0;
  const favorites = useFavoriteToggle();

  const firstName = session?.user.fullName.trim().split(/\s+/)[0] || undefined;
  const total = categories.data?.reduce((sum, category) => sum + category.listingCount, 0) || undefined;
  const latestItems = useMemo(() => latest.data?.pages[0]?.items ?? [], [latest.data]);
  const items = useMemo(() => latestItems.slice(0, GRID_SIZE), [latestItems]);
  // Vitrin: öne çıkan ilanlar; yoksa fotoğraflı en yeni ilanlar (main'deki `useFeaturedListings` davranışı).
  const showcase = useMemo(() => {
    if (featured.data?.length) return featured.data;
    return latestItems.filter((listing) => listing.coverImageUri).slice(0, FEATURED_FALLBACK);
  }, [featured.data, latestItems]);
  const showcaseViews = useMemo(() => showcase.map(toListingView), [showcase]);
  const featuredLoading = featured.isPending || (!featured.data?.length && latest.isPending);

  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  const openResults = (search: ListingSearch = EMPTY_SEARCH) => router.push(resultsHref(search));
  const openListing = (id: string) => router.push(listingHref(id));
  const toggleFavorite = (id: string) => favorites.toggle(id, [...showcase, ...items].find((listing) => listing.id === id) ?? null);

  // Gösterge yalnız kullanıcı çektiğinde açılır ve dört yenilemenin hepsi bitince kapanır (arka plan yeniden çekmesi göstergeyi açmaz).
  const { refetch: refetchLatest } = latest;
  const { refetch: refetchFeatured } = featured;
  const { refetch: refetchCategories } = categories;
  const { refetch: refetchFinancing } = financingCount;
  const refreshAll = useCallback(
    () => Promise.allSettled([refetchLatest(), refetchFeatured(), refetchCategories(), refetchFinancing()]),
    [refetchLatest, refetchFeatured, refetchCategories, refetchFinancing],
  );
  const { pulling, onRefresh } = usePullRefresh(refreshAll);

  // Üst alan kaydırılıp geçilince durum çubuğu simgeleri açık zemine göre koyulaşır.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = heroHeight > 0 && event.nativeEvent.contentOffset.y > heroHeight - 40;
    if (next !== pastHero) setPastHero(next);
  };

  return (
    <View style={styles.container} testID="tab-screen-home">
      <FocusStatusBar style={pastHero ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
        onScroll={onScroll}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="home-list">
        <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
          <HomeHero
            photos={photoWall.data ?? []}
            firstName={firstName}
            totalListings={total}
            unreadNotifications={unread}
            onSearch={(query) => openResults(buildOrEmpty({ query }))}
            onFilter={() => router.push(filtersHref())}
            onNotifications={() => router.navigate('/notifications')}
          />
        </View>

        {/* Üst alanın altındaki bölümler ilk açılışta kademeli, hafifçe yükselerek gelir (hareketi azalt açıkken anında). */}
        <Animated.View entering={enterFadeUp(0)} style={styles.quickActions} testID="home-quick-filters">
          <QuickActions onSelect={(action) => openResults(quickActionSearch(action.key))} />
        </Animated.View>

        {favorites.failure ? (
          <View style={styles.notice}>
            <FavoriteFailureNotice message={favorites.failure} testID="home-favorite-failure" />
          </View>
        ) : null}

        <Animated.View entering={enterFadeUp(1)} testID="home-financing-promo">
          <PromoBanner count={financingCount.data} onPress={() => openResults(FINANCING_SEARCH)} />
        </Animated.View>

        <Animated.View entering={enterFadeUp(2)} style={styles.section}>
          <SectionHeader title="Öne Çıkan İlanlar" action="Tümü" onAction={() => openResults(PRICE_DESC_SEARCH)} testID="home-featured-header" />
          {featuredLoading ? (
            <StateView loading />
          ) : showcaseViews.length ? (
            <Animated.View entering={enterFade()} testID="home-featured">
              <FeaturedCarousel listings={showcaseViews} onOpen={openListing} />
            </Animated.View>
          ) : null}
        </Animated.View>

        <Animated.View entering={enterFadeUp(3)} style={styles.section}>
          <SectionHeader title="Yeni Gelenler" action="Tümü" onAction={() => openResults()} testID="home-new-header" />
          {latest.isPending ? (
            <View testID="home-loading">
              <StateView loading />
            </View>
          ) : latest.isError ? (
            <View testID="home-error">
              <StateView icon="wifi-off" title="İlanlar yüklenemedi" actions={[{ title: 'Tekrar dene', onPress: () => void latest.refetch() }]} />
            </View>
          ) : items.length === 0 ? (
            <View testID="home-empty">
              <StateView icon="search" title="Henüz ilan yok" message="Şu an yayında ilan bulunmuyor. Daha sonra tekrar bakın." />
            </View>
          ) : (
            <Animated.View entering={enterFade()} style={styles.grid} testID="home-new-arrivals">
              {rows.map((row) => (
                <View key={row[0].id} style={styles.gridRow}>
                  {row.map((item) => (
                    <ListingTile
                      key={item.id}
                      listing={toListingView(item)}
                      onPress={() => openListing(item.id)}
                      isFavorite={favorites.isFavorite(item.id)}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                      testID={`listing-card-${item.id}`}
                    />
                  ))}
                  {row.length === 1 ? <View style={styles.flex} /> : null}
                </View>
              ))}
              <Button
                title={total ? `Tüm ilanları gör (${total})` : 'Tüm ilanları gör'}
                variant="navy"
                icon="arrow-right"
                onPress={() => openResults()}
                testID="home-all-listings"
              />
            </Animated.View>
          )}
        </Animated.View>

        <HelpCard onCall={() => callCompany((message) => Alert.alert('Hemen Ara', message))} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onAction, testID }: { title: string; action: string; onAction: () => void; testID: string }) {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${title}, tümü`}
        onPress={onAction}
        style={styles.sectionAction}
        testID={`${testID}-all`}>
        <Text variant="smallSemibold" color="heading">
          {action}
        </Text>
        <Icon name="chevron-right" size={18} color="heading" />
      </Pressable>
    </View>
  );
}

function HelpCard({ onCall }: { onCall: () => void }) {
  return (
    <View style={styles.help} testID="home-call-card">
      <View style={styles.helpIcon}>
        <Icon name="mci:phone-in-talk" size={26} color="white" />
      </View>
      <Text variant="heading" style={styles.white}>
        Aradığını bulamadın mı?
      </Text>
      <Text variant="body" style={styles.helpText}>
        Filomuz her gün yenileniyor. İhtiyacını söyle, sana uygun aracı birlikte bulalım.
      </Text>
      <Button title="Hemen Ara" icon="phone" onPress={onCall} testID="home-call" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.four, gap: Spacing.four },
  flex: { flex: 1 },
  white: { color: Colors.white },
  quickActions: { marginTop: -Spacing.two },
  notice: { marginHorizontal: Spacing.three },
  section: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  grid: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  gridRow: { flexDirection: 'row', gap: Spacing.three },
  help: {
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.xl,
    backgroundColor: Colors.navy,
  },
  helpIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { color: '#C9D5E5' },
});
