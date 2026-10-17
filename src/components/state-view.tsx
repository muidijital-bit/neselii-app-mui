import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  loading?: boolean;
  title?: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
};

/** Yükleniyor / boş / hata durumları için ortak görünüm. */
export function StateView({ loading, title, message, actionTitle, onAction }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {title ? (
        <ThemedText type="subtitle" style={styles.center}>
          {title}
        </ThemedText>
      ) : null}
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
