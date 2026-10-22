import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FormError, TextField, useClearFailureOnEdit } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { forgotPasswordSchema, type ForgotPasswordValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * Şifre sıfırlama isteği. Kayıtlı hesaba Supabase sıfırlama bağlantısı gönderilir; bilinen/bilinmeyen e-posta için AYNI başarı iletisi
 * gösterilir (hesap varlığı yanıttan anlaşılmaz). Bağlantı uygulamayı "Yeni Şifre" ekranında açar (ResetPasswordScreen).
 */
export function ForgotPasswordScreen() {
  const { auth } = useServices();
  const router = useRouter();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, setError, subscribe } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const email = useWatch({ control, name: 'email' });
  useClearFailureOnEdit(subscribe, clearFailure); // alan düzenlenince eski sunucu hatası kalkar

  // Doğrulama başarısız olsa da yeni deneme eski genel hatayı (ör. "E-posta veya şifre hatalı.") temizler; geçerli gönderimde `submit` temizler.
  const onSubmit = handleSubmit(async ({ email }) => {
    const result = await submit(
      () => auth.requestPasswordReset(email),
      () => setSentTo(email.trim()),
    );
    if (result?.fieldErrors.email) setError('email', { message: result.fieldErrors.email });
  }, clearFailure);

  return (
    <View style={styles.container} testID="forgot-password-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Şifremi Unuttum" testID="forgot-back" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.content}>
          {sentTo ? (
            <>
              <View style={styles.sent} accessibilityLiveRegion="polite" testID="forgot-sent">
                <Icon name="mail" size={24} color="success" />
                <Text variant="body" style={styles.flex}>
                  {`${sentTo} adresine şifre sıfırlama bağlantısı gönderdik. Bağlantıya bu telefondan dokunarak yeni şifrenizi belirleyebilirsiniz.`}
                </Text>
              </View>
              <Button title="Tekrar gönder" variant="outline" onPress={() => setSentTo(null)} testID="forgot-again" />
            </>
          ) : (
            <>
              <Text variant="body" color="textSecondary" style={styles.lead}>
                E-posta adresinizi girin; şifre sıfırlama bağlantısını gönderelim.
              </Text>
              <TextField control={control} name="email" label="E-posta" type="email" autoComplete="email" returnKeyType="done" onSubmitEditing={onSubmit} testID="forgot-email" />
              <FormError message={failure?.message ?? null} />
              <Button title="Sıfırlama İste" disabled={!email.includes('@')} loading={submitting} onPress={() => void onSubmit()} testID="forgot-submit" />
            </>
          )}
          <Pressable
            hitSlop={8}
            accessibilityRole="link"
            style={styles.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            testID="forgot-to-login">
            <Text variant="bodySemibold" color="green">
              Girişe dön
            </Text>
          </Pressable>
        </FormScroll>
      </KeyboardAvoidingView>
    </View>
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
