import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, textStyles } from '@/theme';

/** Sekmelerin ve geçici giriş hedefinin içeriği ilgili görevlerde gelir; bu ekran yalnızca gezinme iskeletini gösterir. */
export function PlaceholderScreen({ title, note, testID, children }: { title: string; note: string; testID: string; children?: ReactNode }) {
  return (
    <Screen edges={['top', 'left', 'right']} testID={testID}>
      <View style={styles.center}>
        <Text style={[textStyles.titlePage, styles.title]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[textStyles.bodySmall, styles.note]}>{note}</Text>
        {children}
      </View>
    </Screen>
  );
}


const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'], gap: spacing.lg },
  title: { color: colors.navy },
  note: { color: colors.slate, textAlign: 'center' },
});
