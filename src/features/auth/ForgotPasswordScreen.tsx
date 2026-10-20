import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { useServices } from '@/services';
import { colors, fontFamily, spacing, textStyles } from '@/theme';

import { FormError, TextField } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { forgotPasswordSchema, type ForgotPasswordValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * Şifre sıfırlama isteği (tasarım 06). Kayıtlı hesaba Supabase sıfırlama bağlantısı gönderilir; bilinen/bilinmeyen e-posta için AYNI
 * genel başarı iletisi gösterilir (hesap varlığı sızdırılmaz). Bağlantı uygulamayı "Yeni Şifre" ekranında açar (ResetPasswordScreen).
 */
export function ForgotPasswordScreen() {
  const { auth } = useServices();
  const { submitting, failure, submit } = useAuthSubmit();
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    const result = await submit(
      () => auth.requestPasswordReset(email),
      () => setRequestedEmail(email),
    );
    if (result?.fieldErrors.email) setError('email', { message: result.fieldErrors.email });
  });

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} background={colors.white} testID="forgot-password-screen">
      <PageHeader title="Şifremi Unuttum" testID="forgot-back" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.form}>
          {requestedEmail === null ? (
            <>
              <Text style={[textStyles.bodyRelaxed, styles.lead]}>E-posta adresinizi girin; şifre sıfırlama adımını başlatalım.</Text>
              <TextField control={control} name="email" label="E-posta" type="email" autoComplete="email" returnKeyType="done" onSubmitEditing={onSubmit} testID="forgot-email" />
              <FormError message={failure?.message ?? null} />
              <Btn label="Sıfırlama İste" onPress={onSubmit} loading={submitting} testID="forgot-submit" />
            </>
          ) : (
            <View style={styles.sent} testID="forgot-sent">
              <Text style={[textStyles.titleSection, styles.sentTitle]} accessibilityRole="header">
                İsteğiniz alındı
              </Text>
              <Text style={[textStyles.bodyRelaxed, styles.lead]}>
                {`${requestedEmail} adresiyle kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Bağlantıya bu cihazda dokunduğunuzda uygulama yeni şifre ekranını açar.`}
              </Text>
              <Btn label="Tekrar gönder" variant="secondary" onPress={() => setRequestedEmail(null)} testID="forgot-again" />
            </View>
          )}
          <View style={styles.switchRow}>
            <Link href="/login" accessibilityRole="link" style={[textStyles.bodySmall, styles.switchLink]} testID="forgot-to-login">
              Girişe dön
            </Link>
          </View>
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  lead: { color: colors.inkMuted },
  sent: { gap: spacing.lg },
  sentTitle: { color: colors.navy },
  switchRow: { alignItems: 'center' },
  switchLink: { color: colors.greenPressed, fontFamily: fontFamily.inter700, paddingVertical: 12, paddingHorizontal: 4 },
});
