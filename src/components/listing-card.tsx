import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ListingSummary } from '@/features/listings/api';
import { useTheme } from '@/hooks/use-theme';
import { formatKm, formatPrice } from '@/lib/format';

type Props = {
  listing: ListingSummary;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

export function ListingCard({ listing, isFavorite, onToggleFavorite }: Props) {
  const theme = useTheme();
  const location = [listing.district, listing.city].filter(Boolean).join(', ');

  return (
    <Link href={{ pathname: '/listing/[id]', params: { id: listing.id } }} asChild>
      <Pressable style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Image
          source={listing.cover_image_url}
          style={styles.image}
          contentFit="cover"
          transition={150}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        <View style={styles.body}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {listing.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {listing.year} · {formatKm(listing.km)}
          </ThemedText>
          {location ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {location}
            </ThemedText>
          ) : null}
          <ThemedText type="subtitle" style={[styles.price, { color: theme.primary }]}>
            {formatPrice(listing.price, listing.currency)}
          </ThemedText>
        </View>
        {onToggleFavorite ? (
          <Pressable hitSlop={12} onPress={onToggleFavorite} style={styles.favorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={theme.primary} />
          </Pressable>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 130,
    aspectRatio: 4 / 3,
  },
  body: {
    flex: 1,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  price: {
    fontSize: 18,
    lineHeight: 24,
    marginTop: 'auto',
  },
  favorite: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
});
