import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

type Props = {
  title: string;
  /** Geri düğmesinin testID'si (Maestro). */
  testID?: string;
  /** Geri düğmesi (varsayılan: açık). */
  back?: boolean;
};

/**
 * Auth ekranlarının beyaz üst çubuğu. Görünüm `@/ui/ScreenHeader` ile birebir aynıdır; ondan farkı geri düğmesine `testID` verilebilmesi ve
 * geri yığını boşken girişe dönülmesidir (`ScreenHeader` testID almaz, `/`'a döner).
 */
export function PageHeader({ title, testID, back = true }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        {back ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            style={styles.back}
            testID={testID}>
            <Icon name="chevron-left" size={30} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <Text variant="title" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  back: { marginLeft: -Spacing.two },
  titles: { flex: 1 },
});
