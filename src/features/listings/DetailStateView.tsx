import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

type Action = { title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'navy' | 'outline'; testID?: string };

type Props = {
  loading?: boolean;
  /** Yükleniyor durumunun ekran okuyucu etiketi (ör. "İlan yükleniyor"). */
  loadingLabel?: string;
  icon?: IconName;
  title?: string;
  message?: string;
  actions?: Action[];
  testID?: string;
};

/**
 * İlan detayı ve galeri durumları: `@/ui/StateView` ile birebir aynı görünüm; ek olarak Maestro akışlarının kullandığı `testID`'leri
 * (kapsayıcı ve eylem düğmeleri) taşır. `@/ui/StateView` testID almadığı için ekranlara özel kopyadır.
 */
export function DetailStateView({ loading, loadingLabel, icon, title, message, actions, testID }: Props) {
  if (loading) {
    return (
      <View style={[styles.container, styles.center]} accessible accessibilityLabel={loadingLabel} accessibilityState={{ busy: true }} testID={testID}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  }
  return (
    <View style={[styles.container, styles.center]} testID={testID}>
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
      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button key={a.title} title={a.title} icon={a.icon} variant={a.variant ?? 'navy'} onPress={a.onPress} testID={a.testID} />
          ))}
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
    backgroundColor: Colors.background,
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
