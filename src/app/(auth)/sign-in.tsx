import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Başarılı girişte korumalı rotalar açılır ve ana sayfaya yönlendirilir
      await signIn(email.trim(), password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + Spacing.five }]}>
          <Logo height={88} />
          <Text variant="body" align="center" style={styles.tagline}>
            Firmamızın filosundan kamyon, çekici, dorse ve ticari araç ilanları.
          </Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <Text variant="title">Giriş Yap</Text>
          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            password
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
          />
          <Link href="/forgot-password" asChild>
            <Pressable hitSlop={8} style={styles.forgot}>
              <Text variant="bodySemibold" color="heading">
                Şifremi unuttum
              </Text>
            </Pressable>
          </Link>
          {error ? (
            <Text variant="small" color="danger">
              {error}
            </Text>
          ) : null}
          <Button title="Giriş Yap" loading={loading} disabled={!email || !password} onPress={onSubmit} />
          <View style={styles.signUp}>
            <Text variant="body" color="textSecondary">
              Hesabınız yok mu?
            </Text>
            <Link href="/sign-up" asChild>
              <Pressable hitSlop={8}>
                <Text variant="bodySemibold" color="green">
                  Kayıt Ol
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five + Spacing.three,
  },
  tagline: { color: '#D5DEEA', fontSize: 17, lineHeight: 26 },
  sheet: {
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl + 12,
    borderTopRightRadius: Radius.xl + 12,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  forgot: { alignSelf: 'flex-end' },
  signUp: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
});
