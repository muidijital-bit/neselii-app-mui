import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Text } from '@/ui/Text';
import { Colors, Spacing } from '@/ui/theme';

/** Sekmelerin ve geçici giriş hedefinin içeriği ilgili görevlerde gelir; bu ekran yalnızca gezinme iskeletini gösterir (main yazı/renk dili). */
export function PlaceholderScreen({ title, note, testID, children }: { title: string; note: string; testID: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID={testID}>
      <FocusStatusBar style="dark" />
      <View style={styles.center}>
        <Text variant="title" align="center" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {note}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
});
