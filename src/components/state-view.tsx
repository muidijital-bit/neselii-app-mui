import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Action = { title: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'navy' | 'outline' };

type Props = {
  loading?: boolean;
  icon?: IconName;
  title?: string;
  message?: string;
  actions?: Action[];
  /** Ekranı ortalamak yerine üstten başlat (tasarımdaki boş durumlar) */
  top?: boolean;
};

/** Yükleniyor / boş / hata durumları için ortak görünüm. */
export function StateView({ loading, icon, title, message, actions, top }: Props) {
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.navy} />
      </View>
    );
  }
  return (
    <View style={[styles.container, !top && styles.center]}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Icon name={icon} size={30} />
        </View>
      ) : null}
      {title ? (
        <Text variant="subheading" align="center" style={styles.title}>
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
            <Button key={a.title} title={a.title} icon={a.icon} variant={a.variant ?? 'navy'} onPress={a.onPress} />
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
