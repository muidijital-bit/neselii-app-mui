import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { ListingSummary } from '@/features/listings/api';
import { formatPrice, isNewListing, statusLabels, timeAgo } from '@/lib/format';

type Props = {
  listing: ListingSummary;
  categoryName?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

export function ListingCard({ listing, categoryName, isFavorite, onToggleFavorite }: Props) {
  const location = [listing.city, listing.district].filter(Boolean).join(' / ');
  const meta = [location, listing.published_at ? timeAgo(listing.published_at) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={{ pathname: '/listing/[id]', params: { id: listing.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.media}>
          <ListingImage uri={listing.cover_url} style={styles.image} />
          {listing.status !== 'published' ? (
            <View style={styles.topBadge}>
              <Badge label={statusLabels[listing.status]} tone="warning" />
            </View>
          ) : isNewListing(listing.published_at) ? (
            <View style={styles.topBadge}>
              <Badge label="Yeni" tone="info" />
            </View>
          ) : null}
          <View style={styles.mediaPills}>
            {listing.photo_count > 0 ? (
              <View style={styles.pill}>
                <Icon name="camera" size={14} color="white" />
                <Text variant="smallSemibold" style={styles.pillText}>
                  {listing.photo_count}
                </Text>
              </View>
            ) : null}
            {listing.has_video ? (
              <View style={styles.pill}>
                <Icon name="play" size={14} color="white" />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="subheading" numberOfLines={2} style={styles.title}>
              {listing.title}
            </Text>
            {onToggleFavorite ? (
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                onPress={onToggleFavorite}>
                <Icon
                  name={isFavorite ? 'mci:heart' : 'heart'}
                  size={24}
                  color={isFavorite ? 'danger' : 'textTertiary'}
                />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Icon name="map-pin" size={15} color="textSecondary" />
            <Text variant="small" numberOfLines={1} style={styles.flex}>
              {meta}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text variant="price" numberOfLines={1} style={styles.flex}>
              {formatPrice(listing.price, listing.currency)}
            </Text>
            {categoryName ? <Badge label={categoryName} /> : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.9 },
  media: { width: 112, height: 98 },
  image: { width: '100%', height: '100%', borderRadius: Radius.md },
  topBadge: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  mediaPills: { position: 'absolute', bottom: Spacing.two, left: Spacing.two, flexDirection: 'row', gap: Spacing.one },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,33,63,0.92)',
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    height: 26,
  },
  pillText: { color: Colors.white, fontSize: 13 },
  body: { flex: 1, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 'auto' },
});
