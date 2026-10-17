import { router } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { StateView } from '@/components/state-view';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites, useToggleFavorite } from '@/features/favorites/api';
import { useAuth } from '@/providers/auth-provider';

export default function FavoritesScreen() {
  const { userId } = useAuth();
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();

  if (!userId) {
    return (
      <ThemedView style={styles.container}>
        <StateView
          title="Favorileriniz"
          message="Beğendiğiniz ilanları kaydetmek için giriş yapın."
          actionTitle="Giriş yap"
          onAction={() => router.push('/sign-in')}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={favorites.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            isFavorite
            onToggleFavorite={() => toggleFavorite.mutate({ listingId: item.id, isFavorite: true })}
          />
        )}
        ListEmptyComponent={
          favorites.isLoading ? (
            <StateView loading />
          ) : (
            <StateView title="Henüz favori yok" message="İlanlardaki kalp simgesine dokunarak ekleyebilirsiniz." />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
});
