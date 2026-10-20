import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { activeFilterCount, formatRelativeDate, userMessage, type ListingSort, type SavedSearch } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { resultsHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { colors, fontFamily, radii, sizes, spacing, textStyles } from '@/theme';

import { useRemoveSavedSearch, useSavedSearchesQuery } from './useSavedSearches';

const ICON_BOX = 40;

const SORT_LABEL: Record<ListingSort, string> = { newest: 'Önce en yeni', 'price-asc': 'Fiyat artan', 'price-desc': 'Fiyat azalan' };

/** Satır alt metni: sıra · filtre sayısı · kaydedilme zamanı (ör. `Fiyat artan · 3 filtre · Bugün`). */
export function savedSearchSubtitle(saved: SavedSearch, nowMs: number): string {
  const filters = activeFilterCount(saved.search);
  return [SORT_LABEL[saved.search.sort], filters > 0 ? `${filters} filtre` : 'Filtre yok', formatRelativeDate(saved.createdAt, nowMs)].filter(Boolean).join(' · ');
}

/**
 * Kayıtlı Aramalarım: en son kaydedilen önce. Satıra dokunmak aramayı AYNI metin, filtre ve sıralamayla sonuç ekranında açar (`resultsHref`);
 * sağdaki çöp kutusu kaydı siler (işlem sürerken satır meşgul, hata görünür ve liste değişmez). Liste profil sayacıyla aynı kaynaktan (`useSavedSearchesQuery`)
 * okunur. Yükleniyor / boş / hata + yeniden deneme vardır.
 */
export function SavedSearchesScreen() {
  const router = useRouter();
  const query = useSavedSearchesQuery();
  const removal = useRemoveSavedSearch();
  const { refetch } = query;

  // Her odakta (ilk açılış, sonuç ekranından dönüş) liste servisle eşitlenir; sürmekte olan yükleme iptal edilmeden bekletilir.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const entries = query.data ?? [];
  const nowMs = Date.now();

  let empty = null;
  if (query.isPending) {
    empty = <SavedSkeletons testID="saved-searches-loading" />;
  } else if (query.isError && query.data === undefined) {
    empty = (
      <StateMessage
        icon="info"
        title="Kayıtlı aramalar yüklenemedi"
        message={userMessage(query.error)}
        actionLabel="Tekrar dene"
        onAction={() => void refetch()}
        testID="saved-searches-error"
      />
    );
  } else {
    empty = (
      <StateMessage
        icon="bookmark"
        title="Henüz kayıtlı aramanız yok"
        message="Arama sonuçlarında sağ üstteki zil simgesine dokunarak aramayı filtre ve sıralamasıyla kaydedebilirsiniz."
        actionLabel="İlanlara göz at"
        actionIcon="search"
        onAction={() => router.navigate('/')}
        testID="saved-searches-empty"
      />
    );
  }

  return (
    <Screen background={colors.white} testID="saved-searches-screen">
      <PageHeader title="Kayıtlı Aramalarım" testID="saved-searches-back" />
      {removal.failure ? (
        <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="saved-searches-failure">
          <Icon name="info" size={18} color={colors.danger} />
          <Text style={styles.noticeText}>{removal.failure}</Text>
        </View>
      ) : null}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={entries}
        extraData={removal.removingId}
        keyExtractor={(saved) => saved.id}
        ListHeaderComponent={
          entries.length > 0 ? (
            <Text style={styles.count} accessibilityLiveRegion="polite" testID="saved-searches-count">
              {`${entries.length} kayıtlı arama`}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <SavedRow
            saved={item}
            subtitle={savedSearchSubtitle(item, nowMs)}
            removing={removal.removingId === item.id}
            disabled={removal.removingId !== null}
            onOpen={() => router.push(resultsHref(item.search))}
            onRemove={() => removal.remove(item.id)}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={empty ?? undefined}
        showsVerticalScrollIndicator={false}
        testID="saved-searches-list"
      />
    </Screen>
  );
}

function SavedRow({
  saved,
  subtitle,
  removing,
  disabled,
  onOpen,
  onRemove,
}: {
  saved: SavedSearch;
  subtitle: string;
  removing: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.rowWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved.title}, ${subtitle}`}
        accessibilityHint="Aramayı kaydedilen filtre ve sıralamayla açar"
        onPress={onOpen}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`saved-search-${saved.id}`}>
        <View style={styles.iconBox}>
          <Icon name="bookmark" size={20} color={colors.blue} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2} testID={`saved-search-title-${saved.id}`}>
            {saved.title}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1} testID={`saved-search-subtitle-${saved.id}`}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.deleteSpace} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved.title} kayıtlı aramasını sil`}
        accessibilityState={{ disabled, busy: removing }}
        disabled={disabled}
        onPress={onRemove}
        style={styles.deleteButton}
        testID={`saved-search-remove-${saved.id}`}>
        {removing ? <ActivityIndicator size="small" color={colors.slate} testID={`saved-search-remove-busy-${saved.id}`} /> : <Icon name="trash-2" size={20} color={colors.slateLight} />}
      </Pressable>
    </View>
  );
}

function SavedSkeletons({ testID }: { testID: string }) {
  return (
    <View style={styles.skeletonList} accessible accessibilityLabel="Kayıtlı aramalar yükleniyor" accessibilityState={{ busy: true }} testID={testID}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.iconBox, styles.skeletonBlock]} />
          <View style={styles.rowText}>
            <View style={[styles.bar, { width: '70%', height: 14 }]} />
            <View style={[styles.bar, { width: '45%', height: 12 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.surface },
  listContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: spacing.xl },
  count: { height: 32, fontFamily: fontFamily.inter600, fontSize: 13, lineHeight: 32, color: colors.inkSoft },
  separator: { height: 10 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: spacing.xl, marginTop: 12, padding: 12, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  noticeText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
  rowWrap: { width: '100%' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft },
  pressed: { backgroundColor: colors.surface },
  iconBox: { width: ICON_BOX, height: ICON_BOX, borderRadius: radii.pill, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { ...textStyles.cardTitle, color: colors.navy },
  rowSubtitle: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 14.4, color: colors.slateLight },
  deleteSpace: { width: sizes.minTouchTarget - 14 },
  deleteButton: { position: 'absolute', top: 0, right: 0, bottom: 0, width: sizes.minTouchTarget + 4, alignItems: 'center', justifyContent: 'center' },
  skeletonList: { gap: 10 },
  skeletonBlock: { backgroundColor: colors.lineSoft },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
});
