import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

/**
 * Mesajlaşma ekranlarının yükleniyor / boş / hata görünümü. `@/ui/StateView` ile birebir aynı görünür; ondan tek farkı Maestro akışlarının
 * kullandığı `testID`'leri (kök ve `<testID>-action`) taşımasıdır (`StateView` testID almıyor).
 */
export function MessagingState({
  loading,
  loadingLabel,
  icon,
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  top,
  testID,
}: {
  loading?: boolean;
  /** Yükleniyor durumunda ekran okuyucu etiketi. */
  loadingLabel?: string;
  icon?: IconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
  /** Ekranı ortalamak yerine üstten başlat (tasarımdaki boş durumlar) */
  top?: boolean;
  testID: string;
}) {
  if (loading) {
    return (
      <View style={[styles.container, styles.center]} accessible accessibilityLabel={loadingLabel} accessibilityState={{ busy: true }} testID={testID}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  }
  return (
    <View style={[styles.container, !top && styles.center]} testID={testID}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Icon name={icon} size={30} />
        </View>
      ) : null}
      {title ? (
        <Text variant="subheading" align="center" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text variant="body" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button title={actionLabel} icon={actionIcon} variant="navy" onPress={onAction} testID={`${testID}-action`} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five + Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  center: { justifyContent: 'center', paddingTop: Spacing.five },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, lineHeight: 26 },
  actions: { alignSelf: 'stretch', gap: Spacing.three, marginTop: Spacing.two },
});
