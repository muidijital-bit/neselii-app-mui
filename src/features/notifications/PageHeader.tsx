import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Geri düğmesinin test kimliği (Maestro akışları); `back={false}` iken kullanılmaz. */
  testID?: string;
  /** Geri butonu (varsayılan: açık) */
  back?: boolean;
  right?: ReactNode;
  /** Başlığın altında, aynı beyaz zemin üzerinde gösterilecek içerik */
  children?: ReactNode;
};

/**
 * Main tasarımındaki beyaz, sola hizalı ekran başlığı (`@/ui/ScreenHeader` ile birebir aynı görünüm); ek olarak geri düğmesine `testID` verir.
 * Üst güvenli alan boşluğunu kendisi ekler. Geçmiş yoksa (soğuk bağlantı açılışı) geri, ana sayfaya düşer.
 */
export function PageHeader({ title, subtitle, testID, back = true, right, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        {back ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.back}
            testID={testID}>
            <Icon name="chevron-left" size={30} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <Text variant="title" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text variant="small">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
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
