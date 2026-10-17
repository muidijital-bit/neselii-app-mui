import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingList } from '@/components/listing-list';
import { OptionSheet } from '@/components/option-sheet';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategoryMap, useListings } from '@/features/listings/api';
import {
  countActiveFilters,
  searchStore,
  sortLabels,
  useSearchState,
  type SearchState,
  type SortKey,
} from '@/features/listings/search-store';
import { useSaveSearch } from '@/features/saved-searches/api';

function searchName(search: SearchState, categoryName?: string) {
  const parts = [categoryName, search.filters.brand, search.query ? `“${search.query}”` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Tüm ilanlar';
}

export default function ListingsScreen() {
  const search = useSearchState();
  const listings = useListings(search);
  const categories = useCategoryMap();
  const saveSearch = useSaveSearch();
  const [sortOpen, setSortOpen] = useState(false);

  const items = listings.data?.pages.flatMap((p) => p.items) ?? [];
  const count = listings.data?.pages[0]?.count ?? 0;
  const categoryName = search.filters.category ? categories.get(search.filters.category)?.name : undefined;
  const filterCount = countActiveFilters(search.filters);

  const onSave = () =>
    saveSearch.mutate(
      { name: searchName(search, categoryName), search },
      {
        onSuccess: () =>
          Alert.alert('Arama kaydedildi', 'Bu aramayla eşleşen yeni ilanlar yayımlandığında bildirim alacaksınız.'),
        onError: (e) => Alert.alert('Arama kaydedilemedi', e.message),
      },
    );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={categoryName ?? 'Tüm İlanlar'}
        subtitle={listings.isLoading ? 'Yükleniyor…' : `${count} ilan bulundu`}
        right={
          <Pressable hitSlop={12} accessibilityLabel="Aramayı kaydet" onPress={onSave}>
            <Icon name="mci:bell-plus-outline" size={28} />
          </Pressable>
        }>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable
            style={styles.filterChip}
            onPress={() => router.push('/filter')}
            accessibilityRole="button">
            <Icon name="sliders" size={20} color="white" />
            <Text variant="bodyMedium" style={styles.white}>
              Filtre · {filterCount}
            </Text>
          </Pressable>
          {search.query ? (
            <Pressable style={styles.queryChip} onPress={() => searchStore.set({ query: '' })}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.queryText}>
                “{search.query}”
              </Text>
              <Icon name="x" size={18} color="textSecondary" />
            </Pressable>
          ) : null}
        </ScrollView>
      </ScreenHeader>

      <ListingList
        data={items}
        refreshing={listings.isRefetching}
        onRefresh={() => void listings.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (listings.hasNextPage && !listings.isFetchingNextPage) void listings.fetchNextPage();
        }}
        ListHeaderComponent={
          items.length ? (
            <View style={styles.resultBar}>
              <Text variant="bodyMedium" color="textSecondary">
                {count} sonuç
              </Text>
              <Pressable style={styles.sort} hitSlop={8} onPress={() => setSortOpen(true)}>
                <Icon name="mci:swap-vertical" size={22} />
                <Text variant="bodyMedium" color="heading">
                  {sortLabels[search.sort]}
                </Text>
              </Pressable>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          listings.isLoading ? (
            <StateView loading />
          ) : listings.isError ? (
            <StateView
              icon="wifi-off"
              title="İlanlar yüklenemedi"
              actions={[{ title: 'Tekrar dene', onPress: () => void listings.refetch() }]}
            />
          ) : (
            <StateView
              top
              icon="mci:magnify-close"
              title="Aramanızla eşleşen ilan bulunamadı"
              message="Farklı bir kelime deneyin veya filtreleri kullanarak aramayı daraltın."
              actions={[
                { title: 'Aramayı temizle', variant: 'outline', onPress: () => searchStore.reset() },
                { title: 'Aramayı Kaydet', icon: 'mci:bell-plus-outline', variant: 'primary', onPress: onSave },
              ]}
            />
          )
        }
      />

      <OptionSheet<SortKey>
        visible={sortOpen}
        title="Sıralama"
        options={(Object.keys(sortLabels) as SortKey[]).map((value) => ({ value, label: sortLabels[value] }))}
        selected={search.sort}
        onSelect={(sort) => searchStore.set({ sort: sort ?? 'newest' })}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  white: { color: Colors.white },
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
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
