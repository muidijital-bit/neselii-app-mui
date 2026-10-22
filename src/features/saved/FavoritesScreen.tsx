import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { userMessage, type FavoriteEntry } from '@/domain';
import { ListingSkeletons, StateMessage } from '@/features/listings/ListStates';
import { toListingView } from '@/features/listings/presentation';
import { listingHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { ListingCard } from '@/ui/ListingCard';
import { Text } from '@/ui/Text';
import { Card, IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';
import { usePullRefresh } from '@/ui/usePullRefresh';

import { FavoriteFailureNotice } from './FavoriteFailureNotice';
import { useFavoriteToggle, useFavoritesQuery } from './useFavorites';

/**
 * Favori İlanlarım: en son eklenen önce. Kart, ilan detayı ve profil sayacıyla AYNI liste (`useFavoritesQuery`) okunur. Kalbe dokunmak favoriden
 * çıkarır (iyimser; servis hata verirse satır geri gelir ve hata görünür). Satılmış/rezerve ilan rozetiyle görünür; yayından kalkmış ya da bulunamayan
 * ilan açıklamalı bir satırla gösterilir ve "Favorilerden kaldır" ile temizlenir (detay açılmaz, çökme yok). Yükleniyor / boş / hata + yeniden deneme vardır.
 */
export function FavoritesScreen() {
  const router = useRouter();
  const query = useFavoritesQuery();
  const favorites = useFavoriteToggle();
  const { refetch } = query;
  // Gösterge yalnız kullanıcı çektiğinde; aşağıdaki odak eşitlemesi (her girişte yeniden çekme) göstergeyi açmaz.
  const { pulling, onRefresh } = usePullRefresh(refetch);

  // Her odakta (ilk açılış, ilan detayından dönüş) liste servisle eşitlenir; sürmekte olan yükleme iptal edilmeden bekletilir.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const entries = query.data ?? [];

  let empty = null;
  if (query.isPending) {
    empty = <ListingSkeletons testID="favorites-loading" />;
  } else if (query.isError && query.data === undefined) {
    empty = <StateMessage icon="wifi-off" title="Favoriler yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="favorites-error" />;
  } else {
    empty = (
      <StateMessage
        top
        icon="heart"
        title="Henüz favori ilanınız yok"
        message="Beğendiğiniz ilanların kalbine dokunarak burada toplayabilirsiniz."
        actionLabel="İlanlara göz at"
        actionIcon="search"
        onAction={() => router.navigate('/')}
        testID="favorites-empty"
      />
    );
  }

  const renderEntry = (entry: FavoriteEntry) => {
    if (entry.listing === null) return <UnavailableFavorite entry={entry} busy={favorites.isPending(entry.listingId)} onRemove={() => favorites.toggle(entry.listingId)} />;
    const listing = entry.listing;
    return (
      <ListingCard
        listing={toListingView(listing)}
        isFavorite={favorites.isFavorite(listing.id)}
        onToggleFavorite={() => favorites.toggle(listing.id, listing)}
        onPress={() => router.push(listingHref(listing.id))}
        testID={`listing-card-${listing.id}`}
      />
    );
  };

  return (
    <View style={styles.container} testID="favorites-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Favori İlanlarım" testID="favorites-back" />
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={entries}
        extraData={favorites}
        keyExtractor={(entry) => entry.listingId}
        ListHeaderComponent={
          entries.length > 0 || favorites.failure ? (
            <View style={styles.header}>
              <FavoriteFailureNotice message={favorites.failure} testID="favorites-failure" />
              {entries.length > 0 ? (
                <Text variant="bodyMedium" color="textSecondary" accessibilityLiveRegion="polite" testID="favorites-count">
                  {`${entries.length} favori ilan`}
                </Text>
              ) : null}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => renderEntry(item)}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={Colors.navy} />}
        testID="favorites-list"
      />
    </View>
  );
}

/** Yayından kalkmış / bulunamayan ilanın güvenli satırı (main'de karşılığı yok; main'in kart diliyle): açıklama ve kaldırma eylemi. */
function UnavailableFavorite({ entry, busy, onRemove }: { entry: FavoriteEntry; busy: boolean; onRemove: () => void }) {
  return (
    <Card>
      <View style={styles.unavailable} testID={`favorite-unavailable-${entry.listingId}`}>
        <IconTile icon="eye-off" color="textSecondary" />
        <View style={styles.unavailableText}>
          <Text variant="subheading" accessibilityRole="header">
            Bu ilan artık yayında değil
          </Text>
          <Text variant="small">İlan yayından kaldırılmış ya da bulunamıyor. Favorilerinizden kaldırabilirsiniz.</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorilerden kaldır"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed, busy && styles.busy]}
        testID={`favorite-unavailable-remove-${entry.listingId}`}>
        <Icon name="trash-2" size={20} color="danger" />
        <Text variant="bodySemibold" color="danger">
          Favorilerden kaldır
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  // Main'deki `ListingList`: 16 kenar boşluğu, kartlar arası 16.
  list: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  header: { gap: Spacing.three },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  unavailableText: { flex: 1, gap: 2 },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.background },
  busy: { opacity: 0.5 },
});
