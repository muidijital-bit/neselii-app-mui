import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/ui/Icon';
import { ListingImage } from '@/ui/ListingImage';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';
import { formatNumber } from '@/ui/format';
import type { ListingView } from '@/ui/listingView';
import { usePop, usePressScale } from '@/ui/motion';

type Props = {
  listing: ListingView;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  testID?: string;
};

/** Ana sayfadaki iki sütunlu ızgara için kompakt ilan kutusu */
export function ListingTile({ listing, onPress, isFavorite, onToggleFavorite, testID }: Props) {
  const financing = listing.financing !== null;
  const press = usePressScale(0.97);
  const heart = usePop();
  const meta = [listing.year, listing.km != null ? `${formatNumber(listing.km)} km` : null].filter(Boolean).join(' · ');

  // Karonun ekran okuyucu etiketi: başlık, fiyat, yıl/km, taksit (kalp ayrı düğmedir, etikete karışmaz).
  const a11yLabel = [listing.title, `${formatNumber(listing.price)} TL`, meta, financing ? 'Taksit' : null].filter(Boolean).join(', ');

  // Kalp karonun Pressable'ının DIŞINDA kardeş düğmedir (aynı görsel konum, mutlak): VoiceOver'da ayrı seçilir. Basınca ölçek dış
  // sarmalayıcıdadır; kalp de karoyla birlikte küçülür.
  return (
    <Animated.View style={[styles.tile, press.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={testID}
        style={styles.fill}>
        <View style={styles.media}>
          <ListingImage
            uri={listing.coverUri}
            style={styles.image}
            icon={listing.categoryIcon}
            iconSize={34}
          />
          {financing ? (
            <View style={styles.financing}>
              <Icon name="credit-card" size={11} color="heading" />
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
          <Icon name={isFavorite ? 'mci:heart' : 'heart'} size={16} color={isFavorite ? 'danger' : 'heading'} />
        </Animated.View>
      </Pressable>
    </Animated.View>
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
  fill: { flexGrow: 1 },
  media: { aspectRatio: 4 / 3 },
  image: { width: '100%', height: '100%' },
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  financingText: { fontFamily: Fonts.bold, fontSize: 10, color: Colors.heading },
  body: { padding: Spacing.two + 2, gap: 3 },
  title: { fontFamily: Fonts.semibold, fontSize: 13.5, lineHeight: 18, color: Colors.text, minHeight: 36 },
  price: { fontFamily: Fonts.headingHeavy, fontSize: 16.5, lineHeight: 22, color: Colors.heading, marginTop: 2 },
  currency: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.textSecondary },
});
