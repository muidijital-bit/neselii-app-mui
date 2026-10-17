import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StateView } from '@/components/state-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/api';
import { useListing } from '@/features/listings/api';
import { useStartConversation } from '@/features/messages/api';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatKm, formatPrice, fuelLabels, transmissionLabels } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { userId } = useAuth();
  const [imageIndex, setImageIndex] = useState(0);

  const listing = useListing(id);
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const startConversation = useStartConversation();

  if (listing.isLoading) return <StateView loading />;
  if (listing.isError || !listing.data) {
    return <StateView title="İlan bulunamadı" message={listing.error?.message} />;
  }

  const data = listing.data;
  const isFavorite = favoriteIds.data?.has(data.id) ?? false;
  const isOwnListing = data.seller_id === userId;
  const images = data.listing_images.length
    ? data.listing_images.map((img) => img.url)
    : data.cover_image_url
      ? [data.cover_image_url]
      : [];

  const specs: [string, string | null][] = [
    ['Marka', data.brand],
    ['Model', [data.model, data.series].filter(Boolean).join(' ')],
    ['Yıl', String(data.year)],
    ['Kilometre', formatKm(data.km)],
    ['Yakıt', data.fuel_type ? fuelLabels[data.fuel_type] : null],
    ['Vites', data.transmission ? transmissionLabels[data.transmission] : null],
    ['Kasa tipi', data.body_type],
    ['Renk', data.color],
    ['Durum', data.condition === 'sifir' ? 'Sıfır' : 'İkinci el'],
    ['Konum', [data.district, data.city].filter(Boolean).join(', ') || null],
    ['İlan tarihi', formatDate(data.created_at)],
  ];

  const requireAuth = (action: () => void) => (userId ? action() : router.push('/sign-in'));

  const onMessage = () =>
    requireAuth(() =>
      startConversation.mutate(
        { listingId: data.id, sellerId: data.seller_id },
        {
          onSuccess: (conversationId) =>
            router.push({ pathname: '/chat/[id]', params: { id: conversationId } }),
          onError: (e) => Alert.alert('Hata', e.message),
        },
      ),
    );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={12}
              onPress={() =>
                requireAuth(() => toggleFavorite.mutate({ listingId: data.id, isFavorite }))
              }>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(url, i) => `${i}-${url}`}
            onMomentumScrollEnd={(e) =>
              setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <Image source={item} style={{ width, aspectRatio: 4 / 3 }} contentFit="cover" />
            )}
            ListEmptyComponent={
              <View style={[{ width, aspectRatio: 4 / 3, backgroundColor: theme.backgroundElement }, styles.noImage]}>
                <Ionicons name="car-sport-outline" size={64} color={theme.textSecondary} />
              </View>
            }
          />
          {images.length > 1 ? (
            <View style={styles.counter}>
              <ThemedText type="small" style={styles.counterText}>
                {imageIndex + 1}/{images.length}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          {data.status === 'sold' ? (
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              SATILDI
            </ThemedText>
          ) : null}
          <ThemedText type="subtitle">{data.title}</ThemedText>
          <ThemedText type="title" style={[styles.price, { color: theme.primary }]}>
            {formatPrice(data.price, data.currency)}
          </ThemedText>
        </View>

        <View style={[styles.section, styles.specs]}>
          {specs
            .filter((spec): spec is [string, string] => !!spec[1])
            .map(([label, value]) => (
              <View key={label} style={[styles.specRow, { borderBottomColor: theme.border }]}>
                <ThemedText themeColor="textSecondary">{label}</ThemedText>
                <ThemedText type="smallBold">{value}</ThemedText>
              </View>
            ))}
        </View>

        {data.description ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Açıklama</ThemedText>
            <ThemedText>{data.description}</ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {!isOwnListing ? (
        <SafeAreaView edges={['bottom']} style={[styles.actions, { borderTopColor: theme.border }]}>
          {data.seller?.phone ? (
            <Button
              title="Ara"
              variant="secondary"
              style={styles.action}
              onPress={() => Linking.openURL(`tel:${data.seller?.phone}`)}
            />
          ) : null}
          <Button
            title="Mesaj gönder"
            style={styles.action}
            loading={startConversation.isPending}
            onPress={onMessage}
          />
        </SafeAreaView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: Spacing.four },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  counter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
  },
  counterText: { color: '#fff' },
  section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.one },
  price: { fontSize: 28, lineHeight: 36 },
  specs: { gap: 0 },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: { flex: 1, marginBottom: Spacing.two },
});
