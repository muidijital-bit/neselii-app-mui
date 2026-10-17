import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ListingList } from '@/components/listing-list';
import { Logo } from '@/components/logo';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Chip, CountBadge } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useCategories, useListings } from '@/features/listings/api';
import { searchStore } from '@/features/listings/search-store';
import { useUnreadNotificationCount } from '@/features/notifications/api';

const LATEST = { query: '', filters: {}, sort: 'newest' as const };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const categories = useCategories();
  const listings = useListings(LATEST);
  const unread = useUnreadNotificationCount();

  const items = listings.data?.pages.flatMap((p) => p.items) ?? [];
  const total = listings.data?.pages[0]?.count ?? 0;

  const openListings = (category?: string) => {
    searchStore.reset({ filters: category ? { category } : {} });
    router.push('/listings');
  };

  const submitSearch = () => {
    searchStore.reset({ query: query.trim() });
    router.push('/listings');
  };

  const header = (
    <View style={styles.sections}>
      <View style={styles.sectionHeader}>
        <Text variant="heading">Kategoriler</Text>
        <Pressable hitSlop={8} onPress={() => router.navigate('/categories')}>
          <Text variant="bodySemibold" color="heading">
            Tümü
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}>
        <Chip
          label="Tümü"
          count={categories.data?.reduce((sum, c) => sum + c.listing_count, 0)}
          selected
          onPress={() => openListings()}
        />
        {categories.data?.map((c) => (
          <Chip key={c.slug} label={c.name} count={c.listing_count} onPress={() => openListings(c.slug)} />
        ))}
      </ScrollView>
      <View style={styles.sectionHeader}>
        <Text variant="heading">Yeni İlanlar</Text>
        {total ? (
          <View style={styles.countPill}>
            <Text variant="smallSemibold" color="heading">
              {total} ilan
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.heroTop}>
          <Logo height={40} />
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Bildirimler"
            onPress={() => router.navigate('/notifications')}>
            <Icon name="bell" size={28} color="white" />
            <View style={styles.bellBadge}>
              <CountBadge count={unread.data ?? 0} />
            </View>
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Icon name="search" size={22} color="textSecondary" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              placeholder="Kelime, ilan no ile ara"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="search"
              style={styles.searchInput}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.filterButton}
            onPress={() => {
              searchStore.reset();
              router.push({ pathname: '/filter', params: { next: 'listings' } });
            }}>
            <Icon name="sliders" size={22} color="white" />
            <Text variant="bodySemibold" style={styles.filterText}>
              Filtre
            </Text>
          </Pressable>
        </View>
      </View>

      <ListingList
        data={items}
        ListHeaderComponent={header}
        refreshing={listings.isRefetching}
        onRefresh={() => {
          void listings.refetch();
          void categories.refetch();
        }}
        ListEmptyComponent={
          listings.isLoading ? (
            <StateView loading />
          ) : listings.isError ? (
            <StateView
              icon="wifi-off"
              title="İlanlar yüklenemedi"
              message="Bağlantınızı kontrol edip tekrar deneyin."
              actions={[{ title: 'Tekrar dene', onPress: () => void listings.refetch() }]}
            />
          ) : (
            <StateView icon="inbox" title="Henüz ilan yok" />
          )
        }
        ListFooterComponent={
          listings.hasNextPage ? (
            <Button title="Tüm ilanları gör" variant="outline" onPress={() => openListings()} />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellBadge: { position: 'absolute', top: -8, right: -8 },
  searchRow: { flexDirection: 'row', gap: Spacing.two },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 54,
  },
  searchInput: { flex: 1, height: 54, fontFamily: Fonts.regular, fontSize: 16, color: Colors.text },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.green,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    height: 54,
  },
  filterText: { color: Colors.white, fontSize: 17 },
  sections: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsScroll: { marginHorizontal: -Spacing.three },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  countPill: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
