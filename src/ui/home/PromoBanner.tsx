import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Radius, Spacing } from '@/ui/theme';

/** Taksit / kredi kampanya kartı (sade: açık turuncu zemin, tek turuncu vurgu) */
export function PromoBanner({ count, onPress }: { count?: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Icon name="mci:credit-card-outline" size={26} color={Colors.orangeDeep} />
      </View>
      <View style={styles.texts}>
        <Text variant="subheading">Kredi kartına 18 ay taksit</Text>
        <Text variant="small">%2,85’ten başlayan kredi seçenekleriyle</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{count != null ? `${count} ilan` : 'İncele'}</Text>
        <Icon name="chevron-right" size={18} color="white" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Colors.orangeSoft,
    borderWidth: 1,
    borderColor: '#FFD9BD',
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 34,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orange,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.white },
});
