import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { PhotoWall } from '@/components/photo-wall';
import { Text } from '@/components/text';
import { CountBadge } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  firstName?: string;
  totalListings?: number;
  unreadNotifications: number;
  onSearch: (query: string) => void;
  onFilter: () => void;
  onNotifications: () => void;
};

export function HomeHero({
  firstName,
  totalListings,
  unreadNotifications,
  onSearch,
  onFilter,
  onNotifications,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [heroHeight, setHeroHeight] = useState(0);
  const [wallTop, setWallTop] = useState(0);

  return (
    <View
      style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}
      onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}>
      {/* Duvar logo satırının altından başlar; logo düz zeminde kalır */}
      {heroHeight > 0 && wallTop > 0 ? (
        <PhotoWall height={heroHeight - wallTop} dim={0.7} columns={4} style={[styles.wall, { top: wallTop }]} />
      ) : null}
      <View
        style={styles.topRow}
        onLayout={(e) => setWallTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height + Spacing.two)}>
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
          Aradığın aracı bul
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
  wall: { position: 'absolute', left: 0, right: 0 },
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
  stat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
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
