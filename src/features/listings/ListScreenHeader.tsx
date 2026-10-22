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
  right?: ReactNode;
  children?: ReactNode;
  /** Maestro akışlarının kullandığı kimlikler (`@/ui/ScreenHeader` testID almadığı için birebir kopyası). */
  backTestID?: string;
  titleTestID?: string;
  subtitleTestID?: string;
};

/** Main'deki beyaz, sola hizalı ekran başlığı (`@/ui/ScreenHeader`) — geri/başlık/alt başlık testID'leriyle. */
export function ListScreenHeader({ title, subtitle, right, children, backTestID, titleTestID, subtitleTestID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.row}>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.back}
          testID={backTestID}>
          <Icon name="chevron-left" size={30} />
        </Pressable>
        <View style={styles.titles}>
          <Text variant="title" numberOfLines={1} accessibilityRole="header" testID={titleTestID}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" testID={subtitleTestID}>
              {subtitle}
            </Text>
          ) : null}
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
