import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListingList } from '@/components/listing-list';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Colors } from '@/constants/theme';
import { useFavorites } from '@/features/favorites/api';

export default function FavoritesScreen() {
  const favorites = useFavorites();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Favori İlanlarım" />
      <ListingList
        data={favorites.data ?? []}
        refreshing={favorites.isRefetching}
        onRefresh={() => void favorites.refetch()}
        ListEmptyComponent={
          favorites.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="heart"
              title="Henüz favori ilanınız yok"
              message="Beğendiğiniz ilanların kalbine dokunarak burada toplayabilirsiniz."
              actions={[{ title: 'İlanlara göz at', icon: 'search', onPress: () => router.navigate('/') }]}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
