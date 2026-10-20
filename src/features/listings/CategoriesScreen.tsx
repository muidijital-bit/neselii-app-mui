import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { CategoryGlyph } from '@/components/CategoryGlyph';
import { Screen } from '@/components/Screen';
import { useTabBarClearance } from '@/components/TabBar';
import { Icon } from '@/components/icons/Icon';
import { userMessage, type Category } from '@/domain';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { StateMessage } from './ListStates';
import { categoryResultsHref } from './routes';
import { useCategoriesQuery } from './useListingsQueries';

const ROW_HEIGHT = 72;

/** Kategoriler (04): sekiz kategori satırı; dokunma, yalnızca seçilen kategoriyi taşıyan sonuç rotasını doğrudan açar (027); Filtre eylemi sonuç ekranındadır. */
export function CategoriesScreen() {
  const tabBarClearance = useTabBarClearance();
  const router = useRouter();
  const categories = useCategoriesQuery();

  let body;
  if (categories.isPending) {
    body = <CategorySkeletons />;
  } else if (categories.isError) {
    body = <StateMessage icon="info" title="Kategoriler yüklenemedi" message={userMessage(categories.error)} actionLabel="Tekrar dene" onAction={() => void categories.refetch()} testID="categories-error" />;
  } else if (categories.data.length === 0) {
    body = <StateMessage icon="search-x" title="Kategori bulunamadı" message="Şu an gösterilecek kategori yok." testID="categories-empty" />;
  } else {
    body = (
      <FlatList
        data={categories.data}
        keyExtractor={(category) => category.id}
        renderItem={({ item }) => <CategoryRow category={item} onPress={() => router.push(categoryResultsHref(item.id))} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        testID="categories-list"
      />
    );
  }

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right']} testID="tab-screen-categories">
      <View style={styles.header}>
        <Text style={[textStyles.titlePage, styles.title]} accessibilityRole="header">
          Kategoriler
        </Text>
      </View>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}

function CategoryRow({ category, onPress }: { category: Category; onPress: () => void }) {
  const subs = category.subcategories.join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.listingCount} ilan, ${category.subcategories.join(', ')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
      testID={`category-row-${category.id}`}>
      <View style={styles.iconBox}>
        <CategoryGlyph category={category} size={22} color={colors.navy} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{category.name}</Text>
        <Text style={styles.rowSubs} numberOfLines={1}>
          {subs}
        </Text>
      </View>
      <View>
        <Badge variant="count" label={String(category.listingCount)} />
      </View>
      <Icon name="chevron-right" size={18} color={colors.slateFaint} />
    </Pressable>
  );
}

function CategorySkeletons() {
  return (
    <View accessible accessibilityLabel="Kategoriler yükleniyor" accessibilityState={{ busy: true }} testID="categories-loading">
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: colors.lineSoft }]} />
          <View style={styles.rowText}>
            <View style={[styles.bar, { width: 110, height: 15 }]} />
            <View style={[styles.bar, { width: 190, height: 13 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 56, justifyContent: 'center', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: colors.white },
  title: { color: colors.navy },
  body: { flex: 1, backgroundColor: colors.white },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  iconBox: { width: 44, height: 44, borderRadius: radii.xl, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: spacing.xs },
  rowName: { fontFamily: fontFamily.montserrat600, fontSize: 15, lineHeight: 18, color: colors.navy },
  rowSubs: { fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 15.6, color: colors.slateLight },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
});
