import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

/** Taksit / kredi kampanya kartı */
export function PromoBanner({ count, onPress }: { count?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient
        colors={[Colors.orange, Colors.orangeDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <Svg width={180} height={180} style={styles.circles}>
          <Circle cx={130} cy={50} r={70} fill={Colors.white} opacity={0.12} />
          <Circle cx={150} cy={140} r={44} fill={Colors.white} opacity={0.1} />
        </Svg>
        <View style={styles.texts}>
          <View style={styles.tag}>
            <Icon name="mci:lightning-bolt" size={14} color={Colors.orangeDeep} />
            <Text style={styles.tagText}>FIRSAT</Text>
          </View>
          <Text style={styles.title}>Kredi kartına{'\n'}18 ay taksit</Text>
          <Text variant="small" style={styles.subtitle}>
            %2,85’ten başlayan kredi seçenekleriyle
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{count ? `${count} taksitli ilan` : 'Taksitli ilanlar'}</Text>
            <Icon name="arrow-right" size={16} color={Colors.orangeDeep} />
          </View>
        </View>
        <View style={styles.iconBubble}>
          <Icon name="mci:credit-card-outline" size={44} color="white" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.three, borderRadius: Radius.xl, boxShadow: '0 10px 24px rgba(240, 90, 0, 0.28)' },
  pressed: { transform: [{ scale: 0.98 }] },
  card: { borderRadius: Radius.xl, padding: Spacing.four - 4, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  circles: { position: 'absolute', right: -20, top: -10 },
  texts: { flex: 1, gap: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1, color: Colors.orangeDeep },
  title: { fontFamily: Fonts.headingHeavy, fontSize: 22, lineHeight: 27, color: Colors.white },
  subtitle: { color: 'rgba(255,255,255,0.88)' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.orangeDeep },
  iconBubble: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
});
