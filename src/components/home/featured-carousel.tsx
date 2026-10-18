import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListingImage } from '@/components/listing-image';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { ListingSummary } from '@/features/listings/api';
import { formatNumber } from '@/lib/format';

const GAP = Spacing.three;

export function FeaturedCarousel({ listings }: { listings: ListingSummary[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.82);
  const [index, setIndex] = useState(0);

  if (!listings.length) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={listings}
        horizontal
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)))}
        scrollEventThrottle={32}
        renderItem={({ item }) => {
          const financing = typeof item.attributes?.financing === 'string' ? item.attributes.financing : null;
          const specs = [item.year, item.km != null ? `${formatNumber(item.km)} km` : null, item.city].filter(Boolean);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}>
              <ListingImage uri={item.cover_url} style={StyleSheet.absoluteFill} iconSize={48} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(5,17,33,0.55)', 'rgba(5,17,33,0.92)']}
                locations={[0.35, 0.65, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.topRow}>
                <View style={styles.featuredTag}>
                  <Icon name="mci:star-four-points" size={12} color="white" />
                  <Text style={styles.featuredText}>ÖNE ÇIKAN</Text>
                </View>
                {financing ? (
                  <View style={styles.financing}>
                    <Text style={styles.financingText}>
                      {financing.startsWith('%') ? '%2,85 kredi' : '18 ay taksit'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.bottom}>
                <Text numberOfLines={2} style={styles.title}>
                  {item.title}
                </Text>
                <Text variant="small" style={styles.specs}>
                  {specs.join('  •  ')}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {formatNumber(item.price)}
                    <Text style={styles.currency}> TL</Text>
                  </Text>
                  <View style={styles.go}>
                    <Icon name="arrow-up-right" size={20} color={Colors.navy} />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
      <View style={styles.dots}>
        {listings.map((l, i) => (
          <View key={l.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  list: { paddingHorizontal: Spacing.three, gap: GAP },
  card: {
    aspectRatio: 1.15,
    borderRadius: Radius.xl + 4,
    overflow: 'hidden',
    backgroundColor: Colors.navy,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.orange,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredText: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1, color: Colors.white },
  financing: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  financingText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.heading },
  bottom: { gap: 4 },
  title: { fontFamily: Fonts.heading, fontSize: 19, lineHeight: 24, color: Colors.white },
  specs: { color: 'rgba(255,255,255,0.8)' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { fontFamily: Fonts.headingHeavy, fontSize: 26, lineHeight: 32, color: Colors.white },
  currency: { fontFamily: Fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  go: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9D3E0' },
  dotActive: { width: 22, backgroundColor: Colors.navy },
});
