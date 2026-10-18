import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { useTabBarSpace } from '@/components/tab-bar';
import { Text } from '@/components/text';
import { Divider, IconTile } from '@/components/ui';
import { categoryIcons } from '@/constants/categories';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/features/listings/api';
import { searchStore } from '@/features/listings/search-store';

export default function CategoriesScreen() {
  const categories = useCategories();
  const tabBarSpace = useTabBarSpace();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kategoriler" back={false} />
      <FlatList
        data={categories.data ?? []}
        keyExtractor={(c) => c.slug}
        ItemSeparatorComponent={() => <Divider />}
        onRefresh={() => void categories.refetch()}
        refreshing={categories.isRefetching}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => {
              searchStore.reset({ filters: { category: item.slug } });
              router.push('/listings');
            }}>
            <IconTile icon={categoryIcons[item.icon] ?? 'grid'} />
            <View style={styles.flex}>
              <Text variant="subheading">{item.name}</Text>
              <Text variant="small" numberOfLines={1}>
                {item.subtypes.join(' · ')}
              </Text>
            </View>
            <View style={styles.count}>
              <Text variant="smallSemibold" color="heading">
                {item.listing_count}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="textTertiary" />
          </Pressable>
        )}
        ListEmptyComponent={
          categories.isLoading ? (
            <StateView loading />
          ) : (
            <StateView
              icon="wifi-off"
              title="Kategoriler yüklenemedi"
              actions={[{ title: 'Tekrar dene', onPress: () => void categories.refetch() }]}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { flexGrow: 1 },
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: { backgroundColor: Colors.background },
  count: {
    minWidth: 40,
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
