import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api';
import { useListings } from '@/features/listings/api';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ListingsScreen() {
  const theme = useTheme();
  const { userId } = useAuth();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  const listings = useListings({ search: deferredSearch || undefined });
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const items = listings.data?.pages.flat() ?? [];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchBar}>
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder="Marka, model veya ilan ara"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isFavorite = favoriteIds.data?.has(item.id) ?? false;
          return (
            <ListingCard
              listing={item}
              isFavorite={isFavorite}
              onToggleFavorite={() =>
                userId
                  ? toggleFavorite.mutate({ listingId: item.id, isFavorite })
                  : router.push('/sign-in')
              }
            />
          );
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (listings.hasNextPage && !listings.isFetchingNextPage) listings.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={listings.isRefetching}
            onRefresh={() => void listings.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          listings.isLoading ? (
            <StateView loading />
          ) : listings.isError ? (
            <StateView title="İlanlar yüklenemedi" message={listings.error.message} actionTitle="Tekrar dene" onAction={() => void listings.refetch()} />
          ) : (
            <StateView title="İlan bulunamadı" message="Arama kriterlerinizi değiştirmeyi deneyin." />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { padding: Spacing.three, paddingBottom: Spacing.two },
  list: { padding: Spacing.three, paddingTop: 0, gap: Spacing.three, flexGrow: 1 },
});
