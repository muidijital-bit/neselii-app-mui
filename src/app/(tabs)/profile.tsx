import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { StateView } from '@/components/state-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <StateView
          title="Neşeli Otomotiv"
          message="Favorilerinizi ve mesajlarınızı görmek için giriş yapın."
          actionTitle="Giriş yap / Kayıt ol"
          onAction={() => router.push('/sign-in')}
        />
      </ThemedView>
    );
  }

  const fullName = session.user.user_metadata.full_name as string | undefined;

  return (
    <ThemedView style={[styles.container, styles.content]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{fullName ?? 'Hesabım'}</ThemedText>
        <ThemedText themeColor="textSecondary">{session.user.email}</ThemedText>
      </View>
      <Button
        title="Çıkış yap"
        variant="secondary"
        onPress={() => signOut().catch((e: Error) => Alert.alert('Hata', e.message))}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four },
  header: { gap: Spacing.one },
});
