import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title="Şifremi Unuttum" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sentTo ? (
          <View style={styles.sent}>
            <Icon name="mail" size={24} color="success" />
            <Text variant="body" style={styles.flex}>
              {sentTo} adresine şifre sıfırlama bağlantısı gönderdik. Bağlantıya bu telefondan dokunarak yeni
              şifrenizi belirleyebilirsiniz.
            </Text>
          </View>
        ) : (
          <>
            <Text variant="body" color="textSecondary" style={styles.lead}>
              E-posta adresinizi girin; şifre sıfırlama bağlantısını gönderelim.
            </Text>
            <TextField
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              error={error ?? undefined}
            />
            <Button title="Sıfırlama İste" disabled={!email.includes('@')} loading={loading} onPress={onSubmit} />
          </>
        )}
        <Pressable hitSlop={8} style={styles.back} onPress={() => router.back()}>
          <Text variant="bodySemibold" color="green">
            Girişe dön
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  lead: { fontSize: 18, lineHeight: 27 },
  sent: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
  back: { alignSelf: 'center', marginTop: Spacing.three },
});
