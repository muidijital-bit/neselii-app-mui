import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Category } from '@/domain';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { StateView } from '@/ui/StateView';
import { useTabBarSpace } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { Divider, IconTile } from '@/ui/Ui';
import { enterFadeUp, useEntranceWindow } from '@/ui/motion';
import { Colors, Radius, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { CATEGORY_ICONS } from './presentation';
import { categoryResultsHref } from './routes';
import { useCategoriesQuery } from './useListingsQueries';

/** Giriş animasyonu alan en fazla satır (ekrana ilk sığanlar); kalanlar animasyonsuz gelir. */
const ANIMATED_ROWS = 10;

/**
 * Kategoriler sekmesi (main tasarımı): kategori satırları sayılarıyla; dokunma, yalnızca seçilen kategoriyi taşıyan sonuç rotasını açar.
 * Üstteki yenileme göstergesi YALNIZ kullanıcı aşağı çektiğinde görünür (`usePullRefresh`): arka plandaki yeniden çekme (bayat veri,
 * filtre/ana sayfanın aynı sorguyu bağlaması) göstergeyi açmaz. İlk yüklemede liste içinde tek bir gösterge vardır.
 */
export function CategoriesScreen() {
  const router = useRouter();
  const categories = useCategoriesQuery();
  const tabBarSpace = useTabBarSpace();
  const { refetch } = categories;
  const { pulling, onRefresh } = usePullRefresh(refetch);
  const entering = useEntranceWindow(categories.data !== undefined);

  return (
    <View style={styles.container} testID="tab-screen-categories">
      <FocusStatusBar style="dark" />
      <ScreenHeader title="Kategoriler" back={false} />
      <FlatList
        data={categories.data ?? []}
        keyExtractor={(category) => category.id}
        ItemSeparatorComponent={() => <Divider />}
        onRefresh={onRefresh}
        refreshing={pulling}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        testID="categories-list"
        renderItem={({ item, index }) => (
          <Animated.View entering={entering && index < ANIMATED_ROWS ? enterFadeUp(index) : undefined}>
            <CategoryRow category={item} onPress={() => router.push(categoryResultsHref(item.id))} />
          </Animated.View>
        )}
        ListEmptyComponent={
          categories.isPending ? (
            <View style={styles.flexFill} testID="categories-loading">
              <StateView loading />
            </View>
          ) : categories.isError ? (
            <View style={styles.flexFill} testID="categories-error">
              <StateView icon="wifi-off" title="Kategoriler yüklenemedi" actions={[{ title: 'Tekrar dene', onPress: () => void categories.refetch() }]} />
            </View>
          ) : (
            <View style={styles.flexFill} testID="categories-empty">
              <StateView icon="grid" title="Kategori bulunamadı" message="Şu an gösterilecek kategori yok." />
            </View>
          )
        }
      />
    </View>
  );
}

function CategoryRow({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.listingCount} ilan, ${category.subcategories.join(', ')}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      testID={`category-row-${category.id}`}>
      <IconTile icon={CATEGORY_ICONS[category.id] ?? 'grid'} />
      <View style={styles.flex}>
        <Text variant="subheading">{category.name}</Text>
        <Text variant="small" numberOfLines={1}>
          {category.subcategories.join(' · ')}
        </Text>
      </View>
      <View style={styles.count}>
        <Text variant="smallSemibold" color="heading">
          {category.listingCount}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  list: { flexGrow: 1 },
  flexFill: { flex: 1 },
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
