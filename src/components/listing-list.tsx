import { FlatList, RefreshControl, StyleSheet, type FlatListProps } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { Colors, Spacing } from '@/constants/theme';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api';
import { useCategoryMap, type ListingSummary } from '@/features/listings/api';

type Props = Omit<FlatListProps<ListingSummary>, 'renderItem' | 'data'> & {
  data: ListingSummary[];
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Favori kalbi ve kategori rozetiyle ilan listesi */
export function ListingList({ data, refreshing, onRefresh, contentContainerStyle, ...rest }: Props) {
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const categories = useCategoryMap();

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      renderItem={({ item }) => {
        const isFavorite = favoriteIds.data?.has(item.id) ?? false;
        return (
          <ListingCard
            listing={item}
            categoryName={categories.get(item.category_slug)?.name}
            categoryIcon={categories.get(item.category_slug)?.icon}
            isFavorite={isFavorite}
            onToggleFavorite={() => toggleFavorite.mutate({ listingId: item.id, isFavorite })}
          />
        );
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        ) : undefined
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
});
