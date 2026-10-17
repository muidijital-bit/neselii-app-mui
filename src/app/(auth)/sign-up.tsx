import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('Şifre çok kısa', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      Alert.alert('Kayıt başarılı', 'E-posta doğrulaması açıksa gelen kutunuzu kontrol edin.');
      router.dismissAll();
    } catch (e) {
      Alert.alert('Kayıt olunamadı', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" autoComplete="name" />
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
          placeholder="Şifre (en az 6 karakter)"
          secureTextEntry
          autoComplete="new-password"
        />
        <Button
          title="Kayıt ol"
          loading={loading}
          disabled={!fullName || !email || !password}
          onPress={onSubmit}
        />
        <Link href="/sign-in" replace style={styles.link}>
          <ThemedText type="linkPrimary">Zaten hesabın var mı? Giriş yap</ThemedText>
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
