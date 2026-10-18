import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { SearchState } from '@/features/listings/search-store';

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
  /** Simge zemini */
  tint: string;
  iconColor: string;
  search: Partial<SearchState>;
};

export const quickActions: QuickAction[] = [
  { key: 'cekici', label: 'Çekici', icon: 'mci:truck-trailer', tint: '#E8EEF8', iconColor: Colors.navy, search: { filters: { category: 'cekici' } } },
  { key: 'damperli', label: 'Damperli', icon: 'mci:dump-truck', tint: '#FFF1E6', iconColor: Colors.orangeDeep, search: { filters: { category: 'kamyon', subtype: 'Damperli' } } },
  { key: 'taksit', label: 'Taksitli', icon: 'mci:credit-card-outline', tint: '#E3F6EA', iconColor: Colors.green, search: { filters: { financing: true } } },
  { key: 'yeni', label: '2020+ Model', icon: 'mci:calendar-star', tint: '#EFEAFB', iconColor: '#6B4FD8', search: { filters: { minYear: 2020 } } },
  { key: 'kasali', label: 'Kasalı', icon: 'mci:truck-cargo-container', tint: '#E8EEF8', iconColor: Colors.navy, search: { filters: { category: 'kamyon', subtype: 'Kasalı' } } },
  { key: 'uygun', label: '1 Milyon altı', icon: 'mci:cash-multiple', tint: '#FFF1E6', iconColor: Colors.orangeDeep, search: { filters: { maxPrice: 1_000_000 } } },
  { key: 'tanker', label: 'Tanker', icon: 'mci:tanker-truck', tint: '#E3F6EA', iconColor: Colors.green, search: { filters: { category: 'kamyon', subtype: 'Tanker' } } },
  { key: 'kamyonet', label: 'Kamyonet', icon: 'mci:van-utility', tint: '#EFEAFB', iconColor: '#6B4FD8', search: { filters: { category: 'ticari-arac' } } },
];

/** Hikâye görünümlü hızlı kısayollar */
export function QuickActions({ onSelect }: { onSelect: (action: QuickAction) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {quickActions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          onPress={() => onSelect(action)}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <LinearGradient
            colors={[Colors.orange, Colors.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ring}>
            <View style={styles.inner}>
              <View style={[styles.icon, { backgroundColor: action.tint }]}>
                <Icon name={action.icon} size={28} color={action.iconColor} />
              </View>
            </View>
          </LinearGradient>
          <Text numberOfLines={1} style={styles.label}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const SIZE = 70;

const styles = StyleSheet.create({
  row: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  item: { width: SIZE + 6, alignItems: 'center', gap: 6 },
  pressed: { transform: [{ scale: 0.95 }] },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, padding: 2.5 },
  inner: {
    flex: 1,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.surface,
    padding: 3,
  },
  icon: { flex: 1, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.heading, textAlign: 'center' },
});
