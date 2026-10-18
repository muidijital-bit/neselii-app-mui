import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { CountBadge } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  backgroundUri?: string | null;
  firstName?: string;
  totalListings?: number;
  unreadNotifications: number;
  onSearch: (query: string) => void;
  onFilter: () => void;
  onNotifications: () => void;
};

/** Logodaki çapraz formdan türetilen şeritler (sağ üst köşe) */
function BrandStripes() {
  return (
    <Svg width={220} height={240} viewBox="0 0 220 240" style={styles.stripes}>
      <Path d="M120 0 H170 L60 240 H10 Z" fill={Colors.green} opacity={0.22} />
      <Path d="M180 0 H205 L95 240 H70 Z" fill={Colors.orange} opacity={0.35} />
      <Path d="M220 0 V40 L130 240 H112 Z" fill={Colors.white} opacity={0.08} />
    </Svg>
  );
}

export function HomeHero({
  backgroundUri,
  firstName,
  totalListings,
  unreadNotifications,
  onSearch,
  onFilter,
  onNotifications,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  return (
    <View style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}>
      {backgroundUri ? (
        // Bulanık araç fotoğrafı + lacivert geçiş: atmosfer verir, fotoğraftaki yazıları gizler
        <Image source={backgroundUri} blurRadius={18} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : null}
      <LinearGradient
        colors={['rgba(10,33,63,0.72)', 'rgba(10,33,63,0.88)', Colors.navy]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <BrandStripes />

      <View style={styles.topRow}>
        <Logo height={38} />
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Bildirimler"
          onPress={onNotifications}
          style={styles.bell}>
          <Icon name="bell" size={22} color="white" />
          <View style={styles.bellBadge}>
            <CountBadge count={unreadNotifications} />
          </View>
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text variant="body" style={styles.greeting}>
          {firstName ? `Merhaba ${firstName},` : 'Merhaba,'}
        </Text>
        <Text variant="display" style={styles.headline}>
          Aradığın aracı{'\n'}
          <Text variant="display" style={styles.headlineAccent}>
            Neşeli
          </Text>
          ’de bul
        </Text>
        {totalListings ? (
          <View style={styles.stat}>
            <View style={styles.liveDot} />
            <Text variant="smallSemibold" style={styles.statText}>
              {totalListings} araç şu an satışta
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.search}>
        <Icon name="search" size={22} color="textSecondary" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => onSearch(query.trim())}
          placeholder="Marka, model veya ilan no"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrele"
          onPress={onFilter}
          style={styles.filterButton}>
          <Icon name="sliders" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four + Spacing.two,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    gap: Spacing.four,
  },
  stripes: { position: 'absolute', top: 0, right: -40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bell: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: { position: 'absolute', top: -4, right: -4 },
  copy: { gap: Spacing.two },
  greeting: { color: '#B9C7DA' },
  headline: { color: Colors.white, fontSize: 28, lineHeight: 35 },
  headlineAccent: { color: Colors.orange, fontSize: 28, lineHeight: 35 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green, boxShadow: '0 0 0 3px rgba(24,167,73,0.3)' },
  statText: { color: '#D5DEEA' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 58,
    paddingLeft: Spacing.three,
    paddingRight: 6,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
  },
  searchInput: { flex: 1, height: 58, fontFamily: Fonts.regular, fontSize: 16, color: Colors.text },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
