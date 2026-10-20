import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { passwordStrength, toAppError } from '@/domain';
import { isAuthLink, useServices } from '@/services';
import { colors, spacing, textStyles } from '@/theme';

import { FormError, StrengthMeter, TextField } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { resetPasswordSchema, type ResetPasswordValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

type LinkState = { status: 'checking' } | { status: 'ready'; email: string } | { status: 'invalid' };

/**
 * Yeni şifre belirleme (tasarım 25). E-postadaki sıfırlama bağlantısı uygulamayı bu ekranda açar; bağlantı doğrulanınca hesabın e-postası
 * gösterilir ve yeni şifre 006 kurallarıyla kaydedilir. Bağlantısız açılış istek ekranına döner; süresi dolmuş bağlantıda yeni bağlantı istenir.
 */
export function ResetPasswordScreen() {
  const { auth } = useServices();
  const url = Linking.useURL();
  // Sonuç doğrulanan URL'ye bağlıdır: yeni bir bağlantı gelince durum kendiliğinden "doğrulanıyor"a döner.
  const [result, setResult] = useState<{ url: string; state: LinkState } | null>(null);
  const state: LinkState = result && result.url === url ? result.state : { status: 'checking' };

  useEffect(() => {
    if (!isAuthLink(url)) return;
    let cancelled = false;
    auth.beginPasswordRecovery(url).then(
      ({ email }) => !cancelled && setResult({ url, state: { status: 'ready', email } }),
      (error: unknown) => {
        toAppError(error);
        if (!cancelled) setResult({ url, state: { status: 'invalid' } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url, auth]);

  if (!isAuthLink(url)) return <Redirect href="/forgot-password" />;
  if (state.status === 'ready') return <ResetPasswordForm email={state.email} />;
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} background={colors.white} testID="reset-password-screen">
      <PageHeader title="Yeni Şifre" testID="reset-back" />
      <View style={styles.center}>
        {state.status === 'checking' ? (
          <ActivityIndicator color={colors.navy} accessibilityLabel="Bağlantı doğrulanıyor" />
        ) : (
          <InvalidLink />
        )}
      </View>
    </Screen>
  );
}

function InvalidLink() {
  const router = useRouter();
  return (
    <View style={styles.done} testID="reset-invalid">
      <Text style={[textStyles.titleSection, styles.doneTitle]} accessibilityRole="header">
        Bağlantı geçersiz
      </Text>
      <Text style={[textStyles.bodyRelaxed, styles.text]}>Şifre sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyin.</Text>
      <Btn label="Yeni bağlantı iste" onPress={() => router.replace('/forgot-password')} testID="reset-request-again" />
    </View>
  );
}

function ResetPasswordForm({ email }: { email: string }) {
  const { auth } = useServices();
  const router = useRouter();
  const { submitting, failure, submit } = useAuthSubmit();
  const [done, setDone] = useState(false);
  const { control, handleSubmit, setError, reset } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });
  const [password, passwordConfirm] = useWatch({ control, name: ['password', 'passwordConfirm'] });
  const strength = passwordStrength(password);
  const passwordsMatch = passwordConfirm !== '' && passwordConfirm === password;

  const onSubmit = handleSubmit(async ({ password: newPassword }) => {
    const result = await submit(
      () => auth.completePasswordReset({ email, newPassword }),
      () => {
        reset(); // parola form belleğinde de kalmasın
        setDone(true);
      },
    );
    if (result?.fieldErrors.newPassword) setError('password', { message: result.fieldErrors.newPassword });
  });

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} background={colors.white} testID="reset-password-screen">
      <PageHeader title="Yeni Şifre" testID="reset-back" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.form}>
          {done ? (
            <View style={styles.done} testID="reset-done">
              <Text style={[textStyles.titleSection, styles.doneTitle]} accessibilityRole="header">
                Şifreniz güncellendi
              </Text>
              <Text style={[textStyles.bodyRelaxed, styles.text]}>Yeni şifrenizle giriş yapabilirsiniz.</Text>
              <Btn label="Girişe dön" onPress={() => router.replace('/login')} testID="reset-to-login" />
            </View>
          ) : (
            <>
              <Text style={[textStyles.bodyRelaxed, styles.text]}>{`${email} için yeni bir şifre belirleyin.`}</Text>
              <View style={styles.passwordGroup}>
                <TextField control={control} name="password" label="Yeni Şifre" type="password" autoComplete="new-password" returnKeyType="next" testID="reset-password" />
                <StrengthMeter level={strength.level} label={strength.label} />
              </View>
              <TextField
                control={control}
                name="passwordConfirm"
                label="Yeni Şifre (Tekrar)"
                type="password"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                okHint={passwordsMatch ? 'Şifreler eşleşiyor' : null}
                testID="reset-password-confirm"
              />
              <FormError message={failure?.message ?? null} />
              <Btn label="Şifreyi Güncelle" onPress={onSubmit} loading={submitting} testID="reset-submit" />
            </>
          )}
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
  form: { paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  text: { color: colors.inkMuted },
  passwordGroup: { gap: spacing.md },
  done: { gap: spacing.lg },
  doneTitle: { color: colors.navy },
});
