import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { MAX_COMPARE, useCompare } from './CompareProvider';
import { COMPARE_HREF } from './routes';

/**
 * Listede en az bir ilan varken görünen lacivert "Karşılaştır (n/3)" hap düğmesi. Çağıran konumlandırır (`bottom`); ekranın altında, içerik
 * üzerinde yüzer. Liste boşsa hiçbir şey çizmez.
 */
export function CompareBar({ bottom, safeArea = false }: { bottom: number; /** Alt güvenli alan payını ekler (ekranın en altında). */ safeArea?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ids } = useCompare();
  if (ids.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottom + (safeArea ? insets.bottom : 0) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Karşılaştır, ${ids.length} ilan seçili`}
        onPress={() => router.push(COMPARE_HREF)}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        testID="compare-bar">
        <Icon name="mci:compare-horizontal" size={20} color="white" />
        <Text variant="smallSemibold" style={styles.text}>
          Karşılaştır ({ids.length}/{MAX_COMPARE})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.navy,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    height: 46,
    boxShadow: '0 4px 14px rgba(10,33,63,0.28)',
  },
  pressed: { opacity: 0.9 },
  text: { color: Colors.white },
});
