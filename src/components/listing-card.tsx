import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { Text } from '@/components/text';
import { categoryIcons } from '@/constants/categories';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { ListingSummary } from '@/features/listings/api';
import { formatNumber, statusLabels, timeAgo } from '@/lib/format';

type Props = {
  listing: ListingSummary;
  categoryName?: string;
  categoryIcon?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

export function ListingCard({ listing, categoryName, categoryIcon, isFavorite, onToggleFavorite }: Props) {
  const financing = typeof listing.attributes?.financing === 'string' ? listing.attributes.financing : null;
  const eyebrow = [categoryName, listing.subtype].filter(Boolean).join(' · ');
  const specs: { icon: IconName; label: string }[] = [
    listing.year ? { icon: 'calendar', label: String(listing.year) } : null,
    listing.km != null ? { icon: 'mci:speedometer', label: `${formatNumber(listing.km)} km` } : null,
    { icon: 'map-pin', label: listing.city },
  ].filter((s): s is { icon: IconName; label: string } => !!s);

  const badge =
    listing.status === 'reserved'
      ? { label: statusLabels.reserved, bg: Colors.warning }
      : listing.status === 'sold'
        ? { label: statusLabels.sold, bg: Colors.danger }
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.media}>
        <ListingImage
          uri={listing.cover_url}
          style={styles.image}
          icon={(categoryIcon && categoryIcons[categoryIcon]) || 'camera'}
          iconSize={44}
          showLabel
        />
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text variant="caption" style={styles.badgeText}>
              {badge.label}
            </Text>
          </View>
        ) : null}
        {onToggleFavorite ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            onPress={onToggleFavorite}
            style={styles.heart}>
            <Icon name={isFavorite ? 'mci:heart' : 'heart'} size={20} color={isFavorite ? 'danger' : 'heading'} />
          </Pressable>
        ) : null}
        {listing.photo_count > 1 || listing.has_video ? (
          <View style={styles.mediaPills}>
            {listing.photo_count > 1 ? (
              <View style={styles.pill}>
                <Icon name="camera" size={13} color="white" />
                <Text variant="caption" style={styles.pillText}>
                  {listing.photo_count}
                </Text>
              </View>
            ) : null}
            {listing.has_video ? (
              <View style={styles.pill}>
                <Icon name="play" size={13} color="white" />
                <Text variant="caption" style={styles.pillText}>
                  Video
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.eyebrowRow}>
          <Text variant="caption" numberOfLines={1} style={styles.eyebrow}>
            {eyebrow}
          </Text>
          {listing.published_at ? <Text variant="caption">{timeAgo(listing.published_at)}</Text> : null}
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>

        <View style={styles.specs}>
          {specs.map((spec) => (
            <View key={spec.icon} style={styles.spec}>
              <Icon name={spec.icon} size={14} color="textSecondary" />
              <Text variant="small" numberOfLines={1}>
                {spec.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={1}>
            {formatNumber(listing.price)}
            <Text style={styles.currency}> {listing.currency === 'TRY' ? 'TL' : listing.currency}</Text>
          </Text>
          {financing ? (
            <View style={styles.financing}>
              <Icon name="credit-card" size={13} color="heading" />
              <Text variant="caption" numberOfLines={1} style={styles.financingText}>
                {financing.startsWith('%') ? financing.replace(' faizli', '') : '18 ay taksit'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(10, 33, 63, 0.06)',
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  media: { aspectRatio: 16 / 10 },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: Spacing.three - 4,
    left: Spacing.three - 4,
    borderRadius: Radius.sm - 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  badgeText: { color: Colors.white, fontFamily: Fonts.bold, letterSpacing: 0.3 },
  heart: {
    position: 'absolute',
    top: Spacing.three - 4,
    right: Spacing.three - 4,
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(10, 33, 63, 0.18)',
  },
  mediaPills: { position: 'absolute', left: Spacing.three - 4, bottom: Spacing.three - 4, flexDirection: 'row', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 20, 35, 0.72)',
    borderRadius: Radius.sm - 2,
    paddingHorizontal: 7,
    height: 24,
  },
  pillText: { color: Colors.white, fontFamily: Fonts.semibold },
  body: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three - 4, paddingBottom: Spacing.three, gap: 6 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eyebrow: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  title: { fontFamily: Fonts.semibold, fontSize: 16.5, lineHeight: 22, color: Colors.text },
  specs: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: 2 },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  price: { flex: 1, fontFamily: Fonts.headingHeavy, fontSize: 22, lineHeight: 28, color: Colors.heading },
  currency: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.textSecondary },
  financing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    maxWidth: '55%',
  },
  financingText: { color: Colors.heading, fontFamily: Fonts.semibold },
});
