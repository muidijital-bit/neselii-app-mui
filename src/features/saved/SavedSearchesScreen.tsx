import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { activeFilterCount, userMessage, type ListingSort, type SavedSearch } from '@/domain';
import { ListingSkeletons, StateMessage } from '@/features/listings/ListStates';
import { resultsHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { timeAgo } from '@/ui/format';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card, IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { Notice } from './FavoriteFailureNotice';
import { useRemoveSavedSearch, useSavedSearchesQuery } from './useSavedSearches';

// Main'deki sıralama adları (`sortLabels`).
const SORT_LABEL: Record<ListingSort, string> = { newest: 'Önce en yeni', 'price-asc': 'Fiyat: düşükten yükseğe', 'price-desc': 'Fiyat: yüksekten düşüğe' };

/** Satır alt metni (main): filtre sayısı · sıra · kaydedilme zamanı (ör. `3 filtre · Önce en yeni · 2 gün önce`). */
export function savedSearchSubtitle(saved: SavedSearch, nowMs: number): string {
  const filters = activeFilterCount(saved.search);
  return [filters > 0 ? `${filters} filtre` : null, SORT_LABEL[saved.search.sort], timeAgo(saved.createdAt, nowMs)].filter(Boolean).join(' · ');
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
  // Gösterge yalnız kullanıcı çektiğinde; aşağıdaki odak eşitlemesi (her girişte yeniden çekme) göstergeyi açmaz.
  const { pulling, onRefresh } = usePullRefresh(refetch);

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
    empty = <ListingSkeletons testID="saved-searches-loading" />;
  } else if (query.isError && query.data === undefined) {
    empty = (
      <StateMessage
        icon="wifi-off"
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
        top
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
    <View style={styles.container} testID="saved-searches-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Kayıtlı Aramalarım" testID="saved-searches-back" />
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={entries}
        extraData={removal.removingId}
        keyExtractor={(saved) => saved.id}
        ListHeaderComponent={
          entries.length > 0 || removal.failure ? (
            <View style={styles.header}>
              {removal.failure ? (
                <Notice tone="danger" alert testID="saved-searches-failure">
                  {removal.failure}
                </Notice>
              ) : null}
              {entries.length > 0 ? (
                <Text variant="bodyMedium" color="textSecondary" accessibilityLiveRegion="polite" testID="saved-searches-count">
                  {`${entries.length} kayıtlı arama`}
                </Text>
              ) : null}
            </View>
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
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="saved-searches-list"
      />
    </View>
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
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved.title}, ${subtitle}`}
        accessibilityHint="Aramayı kaydedilen filtre ve sıralamayla açar"
        onPress={onOpen}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`saved-search-${saved.id}`}>
        <IconTile icon="bookmark" />
        <View style={styles.rowText}>
          <Text variant="subheading" numberOfLines={1} testID={`saved-search-title-${saved.id}`}>
            {saved.title}
          </Text>
          <Text variant="small" numberOfLines={1} testID={`saved-search-subtitle-${saved.id}`}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${saved.title} kayıtlı aramasını sil`}
          accessibilityState={{ disabled, busy: removing }}
          disabled={disabled}
          onPress={onRemove}
          testID={`saved-search-remove-${saved.id}`}>
          {removing ? (
            <ActivityIndicator size="small" color={Colors.danger} testID={`saved-search-remove-busy-${saved.id}`} />
          ) : (
            <Icon name="trash-2" size={22} color={disabled ? 'textTertiary' : 'danger'} />
          )}
        </Pressable>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  header: { gap: Spacing.three },
  rowText: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: Colors.background },
});
