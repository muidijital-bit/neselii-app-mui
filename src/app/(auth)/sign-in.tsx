import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.dismissAll();
    } catch (e) {
      Alert.alert('Giriş yapılamadı', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          secureTextEntry
          autoComplete="current-password"
        />
        <Button title="Giriş yap" loading={loading} disabled={!email || !password} onPress={onSubmit} />
        <Link href="/sign-up" replace style={styles.link}>
          <ThemedText type="linkPrimary">Hesabın yok mu? Kayıt ol</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
