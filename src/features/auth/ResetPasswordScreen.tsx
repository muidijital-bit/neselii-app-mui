import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View, type TextInput as TextInputInstance } from 'react-native';

import { toAppError } from '@/domain';
import { isAuthLink, useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FormError, StrengthMeter, TextField, useClearFailureOnEdit } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { resetPasswordSchema, type ResetPasswordValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

type LinkState = { status: 'checking' } | { status: 'ready'; email: string } | { status: 'invalid' };

/**
 * Yeni şifre belirleme. E-postadaki sıfırlama bağlantısı uygulamayı bu ekranda açar; bağlantı doğrulanınca hesabın e-postası gösterilir ve
 * yeni şifre kayıt kurallarıyla kaydedilir. Bağlantısız açılış istek ekranına döner; süresi dolmuş bağlantıda yeni bağlantı istenir.
 */
export function ResetPasswordScreen() {
  const { auth } = useServices();
  // `useURL` yalnız açılış URL'sini ve ekran açıkken gelen olayları görür; uygulama arka plandayken bağlantıya dokunulunca bu ekran
  // olaydan SONRA açıldığı için bağlantıyı kaçırırdı. `useLinkingURL` son gelen URL'yi de döner.
  const url = Linking.useLinkingURL();
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
    <View style={styles.container} testID="reset-password-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Yeni Şifre" back={false} />
      {state.status === 'checking' ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.navy} accessibilityLabel="Bağlantı doğrulanıyor" />
        </View>
      ) : (
        <InvalidLink />
      )}
    </View>
  );
}

function InvalidLink() {
  const router = useRouter();
  return (
    <View style={styles.content} testID="reset-invalid">
      <View style={[styles.notice, styles.noticeDanger]} accessibilityLiveRegion="polite">
        <Icon name="alert-circle" size={24} color="danger" />
        <View style={styles.noticeText}>
          <Text variant="bodySemibold" color="heading" accessibilityRole="header">
            Bağlantı geçersiz
          </Text>
          <Text variant="body">Şifre sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyin.</Text>
        </View>
      </View>
      <Button title="Yeni bağlantı iste" onPress={() => router.replace('/forgot-password')} testID="reset-request-again" />
    </View>
  );
}

function ResetPasswordForm({ email }: { email: string }) {
  const { auth } = useServices();
  const router = useRouter();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();
  const cancel = useAuthSubmit();
  const clearCancelFailure = cancel.clearFailure;
  const [done, setDone] = useState(false);
  const { control, handleSubmit, setError, reset, subscribe } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });
  const [password, passwordConfirm] = useWatch({ control, name: ['password', 'passwordConfirm'] });
  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  // Her yeni deneme (doğrulama başarısız olsa da) önceki genel hataları temizler; "Vazgeç" hatası da artık geçerli değildir.
  const clearFailures = useCallback(() => {
    clearFailure();
    clearCancelFailure();
  }, [clearFailure, clearCancelFailure]);
  useClearFailureOnEdit(subscribe, clearFailures); // alan düzenlenince eski hatalar da hemen kalkar
  const confirmRef = useRef<TextInputInstance>(null);
  const onSubmit = handleSubmit(async ({ password: newPassword }) => {
    clearCancelFailure();
    const result = await submit(
      () => auth.completePasswordReset({ email, newPassword }),
      () => {
        reset(); // parola form belleğinde de kalmasın
        setDone(true);
      },
    );
    if (result?.fieldErrors.newPassword) setError('password', { message: result.fieldErrors.newPassword });
  }, clearFailures);

  // "Vazgeç": bağlantının açtığı kurtarma oturumu kapatılır ve girişe dönülür (uygulama oturumu bu ekranda hiç kurulmamıştır).
  const onCancel = () =>
    void cancel.submit(
      () => auth.signOut(),
      () => router.replace('/login'),
    );

  return (
    <View style={styles.container} testID="reset-password-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Yeni Şifre" back={false} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.content}>
          {done ? (
            <>
              <View style={styles.notice} accessibilityLiveRegion="polite" testID="reset-done">
                <Icon name="check-circle" size={24} color="success" />
                <View style={styles.noticeText}>
                  <Text variant="bodySemibold" color="heading" accessibilityRole="header">
                    Şifreniz güncellendi
                  </Text>
                  <Text variant="body">Yeni şifrenizle giriş yapabilirsiniz.</Text>
                </View>
              </View>
              <Button title="Girişe dön" onPress={() => router.replace('/login')} testID="reset-to-login" />
            </>
          ) : (
            <>
              <Text variant="body" color="textSecondary" style={styles.lead}>
                {`${email} için yeni bir şifre belirleyin.`}
              </Text>
              <TextField
                control={control}
                name="password"
                label="Yeni Şifre"
                type="password"
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                testID="reset-password"
              />
              <StrengthMeter password={password} />
              <TextField
                ref={confirmRef}
                control={control}
                name="passwordConfirm"
                label="Yeni Şifre (Tekrar)"
                type="password"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                liveError={mismatch ? 'Şifreler eşleşmiyor.' : undefined}
                testID="reset-password-confirm"
              />
              <FormError message={failure?.message ?? cancel.failure?.message ?? null} />
              <Button title="Şifreyi Güncelle" disabled={password === '' || passwordConfirm === ''} loading={submitting} onPress={() => void onSubmit()} testID="reset-submit" />
              <Button title="Vazgeç ve çıkış yap" variant="outline" loading={cancel.submitting} onPress={onCancel} testID="reset-cancel" />
            </>
          )}
        </FormScroll>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three },
  lead: { fontSize: 18, lineHeight: 27 },
  // Bilgi kutusu: main'deki "bağlantı gönderildi" kutusunun dili (Şifremi Unuttum).
  notice: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  noticeDanger: { backgroundColor: Colors.dangerSoft },
  noticeText: { flex: 1, gap: Spacing.one },
});
