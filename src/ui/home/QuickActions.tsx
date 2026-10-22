import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Spacing } from '@/ui/theme';

export type QuickAction = {
  key: string;
  label: string;
  icon: IconName;
};

/** Kısayolların arama karşılığı ekranda kurulur (`features/listings/home`): anahtarlar sabittir. */
export const quickActions: QuickAction[] = [
  { key: 'cekici', label: 'Çekici', icon: 'mci:truck-trailer' },
  { key: 'damperli', label: 'Damperli', icon: 'mci:dump-truck' },
  { key: 'taksit', label: 'Taksitli', icon: 'mci:credit-card-outline' },
  { key: 'yeni', label: '2020+', icon: 'mci:calendar-star' },
  { key: 'kasali', label: 'Kasalı', icon: 'mci:truck-cargo-container' },
  { key: 'uygun', label: '1 Milyon altı', icon: 'mci:cash-multiple' },
  { key: 'tanker', label: 'Tanker', icon: 'mci:tanker-truck' },
  { key: 'kamyonet', label: 'Kamyonet', icon: 'mci:van-utility' },
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
          testID={`quick-${action.key}`}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={styles.circle}>
            <Icon name={action.icon} size={28} color={Colors.navy} />
          </View>
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
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.heading, textAlign: 'center' },
});
