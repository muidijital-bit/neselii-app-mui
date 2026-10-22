import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';
import { formatNumber, statusLabels, timeAgo } from '@/ui/format';
import type { ListingView } from '@/ui/listingView';
import { usePop, usePressScale } from '@/ui/motion';

type Props = {
  listing: ListingView;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  testID?: string;
};

export function ListingCard({ listing, onPress, isFavorite, onToggleFavorite, testID }: Props) {
  const press = usePressScale(0.98);
  const heart = usePop();
  const financing = listing.financing;
  const eyebrow = [listing.categoryName, listing.subtype].filter(Boolean).join(' · ');
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

  const financingLabel = financing ? (financing.startsWith('%') ? financing.replace(' faizli', '') : '18 ay taksit') : null;
  // Kartın ekran okuyucu etiketi: anlamlı alanlar sırayla (kalp ayrı düğmedir, etikete karışmaz).
  const a11yLabel = [
    listing.title,
    `${formatNumber(listing.price)} TL`,
    badge?.label,
    eyebrow,
    ...specs.map((spec) => spec.label),
    financingLabel,
    listing.publishedAt ? timeAgo(listing.publishedAt) : null,
  ]
    .filter(Boolean)
    .join(', ');

  // Kalp kartın Pressable'ının DIŞINDA kardeş düğmedir (aynı görsel konum, mutlak): VoiceOver'da ayrı seçilir ve kartın etiketine
  // karışmaz. Basınca ölçek dış sarmalayıcıdadır; kalp de kartla birlikte küçülür.
  return (
    <Animated.View style={[styles.card, press.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={testID}>
        <View style={styles.media}>
          <ListingImage
            uri={listing.coverUri}
            style={styles.image}
            icon={listing.categoryIcon}
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
          {listing.photoCount > 1 || listing.hasVideo ? (
            <View style={styles.mediaPills}>
              {listing.photoCount > 1 ? (
                <View style={styles.pill}>
                  <Icon name="camera" size={13} color="white" />
                  <Text variant="caption" style={styles.pillText}>
                    {listing.photoCount}
                  </Text>
                </View>
              ) : null}
              {listing.hasVideo ? (
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
            {listing.publishedAt ? <Text variant="caption">{timeAgo(listing.publishedAt)}</Text> : null}
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
              <Text style={styles.currency}> TL</Text>
            </Text>
            {financing ? (
              <View style={styles.financing}>
                <Icon name="credit-card" size={13} color="heading" />
                <Text variant="caption" numberOfLines={1} style={styles.financingText}>
                  {financingLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      {onToggleFavorite ? (
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={() => {
            heart.pop(!isFavorite);
            onToggleFavorite();
          }}
          style={styles.heart}
          testID={testID ? `${testID}-favorite` : undefined}>
          <Animated.View style={heart.style}>
            <Icon name={isFavorite ? 'mci:heart' : 'heart'} size={20} color={isFavorite ? 'danger' : 'heading'} />
          </Animated.View>
        </Pressable>
      ) : null}
    </Animated.View>
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
