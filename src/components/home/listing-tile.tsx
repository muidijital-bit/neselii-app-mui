import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { Text } from '@/components/text';
import { categoryIcons } from '@/constants/categories';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { ListingSummary } from '@/features/listings/api';
import { formatNumber, isNewListing } from '@/lib/format';

type Props = {
  listing: ListingSummary;
  categoryIcon?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

/** Ana sayfadaki iki sütunlu ızgara için kompakt ilan kutusu */
export function ListingTile({ listing, categoryIcon, isFavorite, onToggleFavorite }: Props) {
  const financing = typeof listing.attributes?.financing === 'string';
  const meta = [listing.year, listing.km != null ? `${formatNumber(listing.km)} km` : null].filter(Boolean).join(' · ');

  return (
    <Link href={{ pathname: '/listing/[id]', params: { id: listing.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        <View style={styles.media}>
          <ListingImage
            uri={listing.cover_url}
            style={styles.image}
            icon={(categoryIcon && categoryIcons[categoryIcon]) || 'camera'}
            iconSize={34}
          />
          {isNewListing(listing.published_at) ? (
            <View style={styles.newTag}>
              <Text style={styles.newText}>YENİ</Text>
            </View>
          ) : null}
          <Pressable
            hitSlop={8}
            accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onPress={onToggleFavorite}
            style={styles.heart}>
            <Icon name={isFavorite ? 'mci:heart' : 'heart'} size={16} color={isFavorite ? 'danger' : 'heading'} />
          </Pressable>
          {financing ? (
            <View style={styles.financing}>
              <Icon name="credit-card" size={11} color="white" />
              <Text style={styles.financingText}>Taksit</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text numberOfLines={2} style={styles.title}>
            {listing.title}
          </Text>
          {meta ? (
            <Text variant="caption" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={styles.price}>
            {formatNumber(listing.price)}
            <Text style={styles.currency}> TL</Text>
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(10, 33, 63, 0.07)',
  },
  pressed: { transform: [{ scale: 0.98 }] },
  media: { aspectRatio: 4 / 3 },
  image: { width: '100%', height: '100%' },
  newTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.green,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newText: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.8, color: Colors.white },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  financing: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.orange,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  financingText: { fontFamily: Fonts.bold, fontSize: 10, color: Colors.white },
  body: { padding: Spacing.two + 2, gap: 3 },
  title: { fontFamily: Fonts.semibold, fontSize: 13.5, lineHeight: 18, color: Colors.text, minHeight: 36 },
  price: { fontFamily: Fonts.headingHeavy, fontSize: 16.5, lineHeight: 22, color: Colors.heading, marginTop: 2 },
  currency: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.textSecondary },
});
