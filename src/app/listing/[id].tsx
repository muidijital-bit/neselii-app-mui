import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui';
import { Company } from '@/constants/company';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api';
import { useCategoryMap, useListing } from '@/features/listings/api';
import { useStartConversation } from '@/features/messages/api';
import { formatKm, formatNumber, formatPrice, statusLabels, statusTones, timeAgo } from '@/lib/format';

const HERO_HEIGHT = 330;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const listing = useListing(id);
  const categories = useCategoryMap();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const startConversation = useStartConversation();

  if (listing.isLoading) return <StateView loading />;
  if (listing.isError || !listing.data) {
    return (
      <StateView
        icon="alert-circle"
        title="İlan bulunamadı"
        message="İlan yayından kaldırılmış olabilir."
        actions={[{ title: 'Geri dön', onPress: () => router.back() }]}
      />
    );
  }

  const data = listing.data;
  const category = categories.get(data.category_slug);
  const photos = data.media.filter((m) => m.type === 'image');
  const hasVideo = data.media.some((m) => m.type === 'video');
  const isFavorite = favoriteIds.data?.has(data.id) ?? false;
  const canMessage = data.status === 'published' || data.status === 'reserved';

  const specs: [string, string | null][] = [
    ['Marka', data.brand],
    ['Model', data.model],
    ['Model Yılı', data.year?.toString() ?? null],
    ['Kilometre', data.km != null ? formatKm(data.km) : null],
    ['Tip', data.subtype],
    ...(category?.filter_fields ?? [])
      .filter((f) => f.key !== 'km' && data.attributes[f.key] != null)
      .map((f): [string, string] => {
        const raw = data.attributes[f.key];
        const value = typeof raw === 'number' ? formatNumber(raw) : String(raw);
        return [f.label, f.unit ? `${value} ${f.unit}` : value];
      }),
  ];

  const openGallery = (start = index) =>
    router.push({ pathname: '/gallery/[id]', params: { id: data.id, index: String(start) } });

  const onMessage = () =>
    startConversation.mutate(data.id, {
      onSuccess: (conversationId) => router.push({ pathname: '/chat/[id]', params: { id: conversationId } }),
      onError: (e) => Alert.alert('Mesaj başlatılamadı', e.message),
    });

  const location = [data.city, data.district].filter(Boolean).join(' / ');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ height: HERO_HEIGHT }}>
          {photos.length ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(m) => m.id}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index: i }) => (
                <Pressable onPress={() => openGallery(i)}>
                  <ListingImage uri={item.url} style={{ width, height: HERO_HEIGHT }} />
                </Pressable>
              )}
            />
          ) : (
            <ListingImage uri={null} style={{ width, height: HERO_HEIGHT }} iconSize={48} />
          )}

          <View style={[styles.heroActions, { top: insets.top + Spacing.two }]}>
            <RoundButton icon="chevron-left" label="Geri" onPress={() => router.back()} />
            <View style={styles.heroRight}>
              <RoundButton
                icon="share-2"
                label="Paylaş"
                onPress={() =>
                  Share.share({
                    message: `${data.title} – ${formatPrice(data.price, data.currency)}\nİlan no: ${data.listing_no}\nNeşeli Kamyon Tır Pazarı`,
                  })
                }
              />
              <RoundButton
                icon={isFavorite ? 'mci:heart' : 'heart'}
                iconColor={isFavorite ? Colors.danger : undefined}
                label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                onPress={() => toggleFavorite.mutate({ listingId: data.id, isFavorite })}
              />
            </View>
          </View>

          {photos.length || hasVideo ? (
            <View style={styles.heroPills}>
              {photos.length ? (
                <Pressable style={styles.pill} onPress={() => openGallery()}>
                  <Icon name="camera" size={18} color="white" />
                  <Text variant="smallSemibold" style={styles.white}>
                    {index + 1} / {photos.length}
                  </Text>
                </Pressable>
              ) : null}
              {hasVideo ? (
                <Pressable style={styles.pill} onPress={() => openGallery(photos.length)}>
                  <Icon name="play" size={18} color="white" />
                  <Text variant="smallSemibold" style={styles.white}>
                    Video
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.summary}>
          <Text variant="body" color="textSecondary">
            {[category?.name, data.subtype].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="title">{data.title}</Text>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={16} color="textSecondary" />
            <Text variant="small" style={styles.flex}>
              {[location, data.published_at ? timeAgo(data.published_at) : null, `İlan no: ${data.listing_no}`]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text variant="priceLarge" style={styles.flex}>
              {formatPrice(data.price, data.currency)}
            </Text>
            <Badge label={statusLabels[data.status]} tone={statusTones[data.status]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="heading">Özellikler</Text>
          {specs
            .filter((spec): spec is [string, string] => !!spec[1])
            .map(([label, value]) => (
              <View key={label} style={styles.specRow}>
                <Text variant="body" color="textSecondary">
                  {label}
                </Text>
                <Text variant="bodySemibold" style={styles.specValue}>
                  {value}
                </Text>
              </View>
            ))}
        </View>

        {data.description ? (
          <View style={styles.section}>
            <Text variant="heading">Açıklama</Text>
            <Text variant="body">{data.description}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.two }]}>
        <Button
          title="Hemen Ara"
          icon="phone"
          variant="outline"
          style={styles.action}
          onPress={() => Linking.openURL(`tel:${Company.phone}`)}
        />
        <Button
          title="Mesaj Gönder"
          icon="message-circle"
          style={styles.actionWide}
          disabled={!canMessage}
          loading={startConversation.isPending}
          onPress={onMessage}
        />
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: IconName;
  iconColor?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      <Icon name={icon} size={24} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.four },
  flex: { flex: 1 },
  white: { color: Colors.white },
  heroActions: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroRight: { flexDirection: 'row', gap: Spacing.three },
  round: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(10,33,63,0.15)',
  },
  heroPills: { position: 'absolute', left: Spacing.three, bottom: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(10,33,63,0.92)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 40,
  },
  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.one, marginBottom: Spacing.two },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  specValue: { flexShrink: 1, textAlign: 'right' },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  action: { flex: 1 },
  actionWide: { flex: 1.3 },
});
