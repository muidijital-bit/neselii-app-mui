import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Card, IconTile } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { countActiveFilters, searchStore, sortLabels, type SortKey } from '@/features/listings/search-store';
import { useDeleteSavedSearch, useSavedSearches } from '@/features/saved-searches/api';
import { timeAgo } from '@/lib/format';

export default function SavedSearchesScreen() {
  const savedSearches = useSavedSearches();
  const remove = useDeleteSavedSearch();

  const confirmDelete = (id: string, name: string) =>
    Alert.alert('Aramayı sil', `“${name}” kayıtlı aramalarınızdan silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kayıtlı Aramalarım" />
      <FlatList
        data={savedSearches.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void savedSearches.refetch()}
        refreshing={savedSearches.isRefetching}
        renderItem={({ item }) => {
          const sort = (item.sort in sortLabels ? item.sort : 'newest') as SortKey;
          const filterCount = countActiveFilters(item.filters);
          return (
            <Card>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => {
                  searchStore.reset({ query: item.query ?? '', filters: item.filters, sort });
                  router.push('/listings');
                }}>
                <IconTile icon="bookmark" />
                <View style={styles.flex}>
                  <Text variant="subheading" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="small" numberOfLines={1}>
                    {[filterCount ? `${filterCount} filtre` : null, sortLabels[sort], timeAgo(item.created_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Pressable
                  hitSlop={12}
                  accessibilityLabel="Aramayı sil"
                  onPress={() => confirmDelete(item.id, item.name)}>
                  <Icon name="trash-2" size={22} color="danger" />
                </Pressable>
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={
          savedSearches.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              top
              icon="bookmark"
              title="Henüz kayıtlı aramanız yok"
              message="Arama sonuçlarında sağ üstteki zil simgesine dokunarak aramayı filtre ve sıralamasıyla kaydedebilirsiniz."
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
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
});
