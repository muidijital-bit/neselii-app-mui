import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

/**
 * Listelerdeki satır içi bilgi/uyarı kutusu (main'de karşılığı yok; main'in renk ve yazı diliyle): `info` açık mavi zemin + lacivert,
 * `danger` açık kırmızı zemin + kırmızı. Ekran okuyucuya duyurulur.
 */
export function Notice({ tone = 'info', icon, alert = false, children, testID }: { tone?: 'info' | 'danger'; icon?: IconName; alert?: boolean; children: ReactNode; testID: string }) {
  const danger = tone === 'danger';
  return (
    <View
      style={[styles.notice, danger && styles.noticeDanger]}
      accessibilityRole={alert ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      testID={testID}>
      <Icon name={icon ?? 'info'} size={18} color={danger ? 'danger' : 'heading'} />
      <Text variant="small" color={danger ? 'danger' : 'heading'} style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

/** Favori işlemi başarısız olup kalp geri alındığında listelerde gösterilen görünür uyarı (ekran okuyucuya duyurulur). */
export function FavoriteFailureNotice({ message, testID }: { message: string | null; testID: string }) {
  if (!message) return null;
  return (
    <Notice tone="danger" alert testID={testID}>
      {message}
    </Notice>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.three - 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHighlight,
  },
  noticeDanger: { backgroundColor: Colors.dangerSoft },
  text: { flex: 1 },
});
