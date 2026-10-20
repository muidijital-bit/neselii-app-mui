import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ListingCard } from '@/components/ListingCard';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { userMessage, type FavoriteEntry } from '@/domain';
import { ListingSkeletons, StateMessage } from '@/features/listings/ListStates';
import { toCardModel } from '@/features/listings/presentation';
import { listingHref } from '@/features/listings/routes';
import { PageHeader } from '@/features/notifications/PageHeader';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

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

  // Her odakta (ilk açılış, ilan detayından dönüş) liste servisle eşitlenir; sürmekte olan yükleme iptal edilmeden bekletilir.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const entries = query.data ?? [];
  const nowMs = Date.now();

  let empty = null;
  if (query.isPending) {
    empty = <ListingSkeletons testID="favorites-loading" />;
  } else if (query.isError && query.data === undefined) {
    empty = (
      <StateMessage icon="info" title="Favoriler yüklenemedi" message={userMessage(query.error)} actionLabel="Tekrar dene" onAction={() => void refetch()} testID="favorites-error" />
    );
  } else {
    empty = (
      <StateMessage
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
    const card = toCardModel(listing, nowMs);
    return (
      <ListingCard
        title={card.title}
        location={card.location}
        dateLabel={card.dateLabel}
        price={card.price}
        category={card.category}
        photoCount={card.photoCount}
        hasVideo={card.hasVideo}
        status={card.status}
        imageUri={card.imageUri}
        favorite={favorites.isFavorite(listing.id)}
        favoriteBusy={favorites.isPending(listing.id)}
        onToggleFavorite={() => favorites.toggle(listing.id, listing)}
        favoriteTestID={`favorite-toggle-${card.id}`}
        onPress={() => router.push(listingHref(card.id))}
        testID={`listing-card-${card.id}`}
      />
    );
  };

  return (
    <Screen background={colors.white} testID="favorites-screen">
      <PageHeader title="Favori İlanlarım" testID="favorites-back" />
      {favorites.failure ? (
        <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="favorites-failure">
          <Icon name="info" size={18} color={colors.danger} />
          <Text style={styles.noticeText}>{favorites.failure}</Text>
        </View>
      ) : null}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={entries}
        extraData={favorites}
        keyExtractor={(entry) => entry.listingId}
        ListHeaderComponent={
          entries.length > 0 ? (
            <Text style={styles.count} accessibilityLiveRegion="polite" testID="favorites-count">
              {`${entries.length} favori ilan`}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => renderEntry(item)}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={empty ?? undefined}
        showsVerticalScrollIndicator={false}
        testID="favorites-list"
      />
    </Screen>
  );
}

/** Yayından kalkmış / bulunamayan ilanın güvenli satırı: ilan verisi yoktur, yalnızca açıklama ve kaldırma eylemi. */
function UnavailableFavorite({ entry, busy, onRemove }: { entry: FavoriteEntry; busy: boolean; onRemove: () => void }) {
  return (
    <View style={styles.unavailable} testID={`favorite-unavailable-${entry.listingId}`}>
      <View style={styles.unavailableHead}>
        <View style={styles.unavailableIcon}>
          <Icon name="eye-off" size={20} color={colors.slate} />
        </View>
        <View style={styles.unavailableText}>
          <Text style={[textStyles.cardTitle, styles.unavailableTitle]} accessibilityRole="header">
            Bu ilan artık yayında değil
          </Text>
          <Text style={[textStyles.caption, styles.unavailableNote]}>İlan yayından kaldırılmış ya da bulunamıyor. Favorilerinizden kaldırabilirsiniz.</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorilerden kaldır"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
        testID={`favorite-unavailable-remove-${entry.listingId}`}>
        <Icon name="trash-2" size={18} color={colors.danger} />
        <Text style={styles.removeText}>Favorilerden kaldır</Text>
      </Pressable>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

// Kart, bildirim ve profil ekranlarının ortak ölçüleri (16 yan boşluk, 10 aralık, r14 kartlar).
const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.surface },
  listContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: spacing.xl },
  count: { height: 32, fontFamily: fontFamily.inter600, fontSize: 13, lineHeight: 32, color: colors.inkSoft },
  separator: { height: 10 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: spacing.xl, marginTop: 12, padding: 12, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  noticeText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
  unavailable: { gap: 6, padding: 10, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft },
  unavailableHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  unavailableIcon: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  unavailableText: { flex: 1, minWidth: 0, gap: 4 },
  unavailableTitle: { color: colors.navy },
  unavailableNote: { color: colors.slateLight },
  removeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.lg, backgroundColor: colors.white },
  removeText: { fontFamily: fontFamily.inter600, fontSize: 14, color: colors.danger },
  pressed: { backgroundColor: colors.surface },
});
