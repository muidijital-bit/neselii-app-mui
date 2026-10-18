import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { HomeHero } from '@/components/home/hero';
import { ListingTile } from '@/components/home/listing-tile';
import { PromoBanner } from '@/components/home/promo-banner';
import { QuickActions } from '@/components/home/quick-actions';
import { Icon } from '@/components/icon';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Company } from '@/constants/company';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api';
import { useCategories, useFeaturedListings, useListingCount, useListings } from '@/features/listings/api';
import { searchStore, type SearchState } from '@/features/listings/search-store';
import { useUnreadNotificationCount } from '@/features/notifications/api';
import { useProfile } from '@/features/profile/api';

const LATEST: SearchState = { query: '', filters: {}, sort: 'newest' };
const GRID_SIZE = 10;

export default function HomeScreen() {
  const categories = useCategories();
  const featured = useFeaturedListings();
  const latest = useListings(LATEST);
  const financingCount = useListingCount({ query: '', filters: { financing: true } });
  const unread = useUnreadNotificationCount();
  const profile = useProfile();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const categoryMap = new Map((categories.data ?? []).map((c) => [c.slug, c]));
  const items = latest.data?.pages[0]?.items.slice(0, GRID_SIZE) ?? [];
  const total = latest.data?.pages[0]?.count ?? undefined;
  const firstName = profile.data?.full_name?.trim().split(/\s+/)[0];

  const openListings = (search: Partial<SearchState> = {}) => {
    searchStore.reset(search);
    router.push('/listings');
  };

  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  const refreshing = latest.isRefetching || featured.isRefetching;
  const refresh = () => {
    void latest.refetch();
    void featured.refetch();
    void categories.refetch();
    void financingCount.refetch();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.navy} />}>
        <HomeHero
          backgroundUri={featured.data?.[0]?.cover_url}
          firstName={firstName}
          totalListings={total}
          unreadNotifications={unread.data ?? 0}
          onSearch={(query) => openListings({ query })}
          onFilter={() => {
            searchStore.reset();
            router.push({ pathname: '/filter', params: { next: 'listings' } });
          }}
          onNotifications={() => router.navigate('/notifications')}
        />

        <View style={styles.quickActions}>
          <QuickActions onSelect={(action) => openListings(action.search)} />
        </View>

        <PromoBanner count={financingCount.data} onPress={() => openListings({ filters: { financing: true } })} />

        <View style={styles.section}>
          <SectionHeader
            title="Öne Çıkan İlanlar"
            accent="mci:fire"
            action="Tümü"
            onAction={() => openListings({ sort: 'price_desc' })}
          />
          {featured.isLoading ? <StateView loading /> : <FeaturedCarousel listings={featured.data ?? []} />}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Yeni Gelenler" accent="mci:truck-fast-outline" action="Tümü" onAction={() => openListings()} />
          {latest.isLoading ? (
            <StateView loading />
          ) : latest.isError ? (
            <StateView
              icon="wifi-off"
              title="İlanlar yüklenemedi"
              actions={[{ title: 'Tekrar dene', onPress: () => void latest.refetch() }]}
            />
          ) : (
            <View style={styles.grid}>
              {rows.map((row) => (
                <View key={row[0].id} style={styles.gridRow}>
                  {row.map((item) => {
                    const isFavorite = favoriteIds.data?.has(item.id) ?? false;
                    return (
                      <ListingTile
                        key={item.id}
                        listing={item}
                        categoryIcon={categoryMap.get(item.category_slug)?.icon}
                        isFavorite={isFavorite}
                        onToggleFavorite={() => toggleFavorite.mutate({ listingId: item.id, isFavorite })}
                      />
                    );
                  })}
                  {row.length === 1 ? <View style={styles.flex} /> : null}
                </View>
              ))}
              <Button
                title={total ? `Tüm ilanları gör (${total})` : 'Tüm ilanları gör'}
                variant="navy"
                icon="arrow-right"
                onPress={() => openListings()}
              />
            </View>
          )}
        </View>

        <HelpCard />
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  accent,
  action,
  onAction,
}: {
  title: string;
  accent: Parameters<typeof Icon>[0]['name'];
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitle}>
        <Icon name={accent} size={22} color={Colors.orange} />
        <Text variant="heading">{title}</Text>
      </View>
      <Pressable hitSlop={8} onPress={onAction} style={styles.sectionAction}>
        <Text variant="smallSemibold" color="green">
          {action}
        </Text>
        <Icon name="chevron-right" size={18} color="green" />
      </Pressable>
    </View>
  );
}

function HelpCard() {
  return (
    <View style={styles.help}>
      <Svg width={160} height={160} style={styles.helpShape}>
        <Path d="M60 0 H110 L40 160 H-10 Z" fill={Colors.green} opacity={0.25} />
        <Path d="M120 0 H140 L70 160 H50 Z" fill={Colors.orange} opacity={0.35} />
      </Svg>
      <View style={styles.helpIcon}>
        <Icon name="mci:phone-in-talk" size={26} color="white" />
      </View>
      <Text variant="heading" style={styles.white}>
        Aradığını bulamadın mı?
      </Text>
      <Text variant="body" style={styles.helpText}>
        Filomuz her gün yenileniyor. İhtiyacını söyle, sana uygun aracı birlikte bulalım.
      </Text>
      <Button title="Hemen Ara" icon="phone" onPress={() => Linking.openURL(`tel:${Company.phone}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.four, gap: Spacing.four },
  flex: { flex: 1 },
  white: { color: Colors.white },
  quickActions: { marginTop: -Spacing.two },
  section: { gap: Spacing.three },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  grid: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  gridRow: { flexDirection: 'row', gap: Spacing.three },
  help: {
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.xl,
    backgroundColor: Colors.navy,
    overflow: 'hidden',
  },
  helpShape: { position: 'absolute', right: -10, top: 0 },
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
