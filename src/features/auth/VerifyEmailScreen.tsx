import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useSession } from '@/features/session/SessionProvider';
import { isAuthLink, useServices } from '@/services';
import { colors, spacing, textStyles } from '@/theme';

import { FormError } from './AuthForm';
import { SignOutButton } from './SignOutButton';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * E-posta doğrulama (tasarım kaynağında tam ekranı yoktur; aynı başlık/buton bileşenleriyle kurulur). Kayıt sonrası Supabase doğrulama
 * bağlantısı gönderir. Bağlantı uygulamayı açarsa doğrulama kendiliğinden tamamlanır; başka cihazda açıldıysa "Doğruladım" hesabı
 * yeniden denetler. RootNavigator, `emailVerified=false` oturumunu bu ekrana kilitler.
 */
export function VerifyEmailScreen() {
  const { auth } = useServices();
  const { session, setSession } = useSession();
  const { submitting, failure, submit } = useAuthSubmit();
  const resend = useAuthSubmit();
  const [resent, setResent] = useState(false);
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);

  // E-postadaki bağlantı uygulamayı bu ekranda açtıysa belirteçle doğrulamayı tamamla (her URL bir kez).
  useEffect(() => {
    if (!isAuthLink(url) || handledUrl.current === url) return;
    handledUrl.current = url;
    void submit(() => auth.completeEmailVerification(url), setSession);
  }, [url, auth, submit, setSession]);

  const complete = () => submit(() => auth.completeEmailVerification(), setSession);
  const sendAgain = () =>
    resend.submit(
      () => auth.resendVerificationEmail(),
      () => setResent(true),
    );

  return (
    <Screen background={colors.navy} statusBar="light" testID="verify-email-screen">
      <View style={styles.page}>
        <BrandLogo height={40} />
        <View style={styles.body}>
          <Text style={[textStyles.eyebrow, styles.eyebrow]}>E-POSTA DOĞRULAMA</Text>
          <Text style={[textStyles.titleLarge, styles.title]} accessibilityRole="header">
            E-postanızı doğrulayın
          </Text>
          <Text style={[textStyles.bodyRelaxed, styles.text]}>
            {session?.user.email ? `${session.user.email} adresine bir doğrulama bağlantısı gönderdik.` : 'E-posta adresinize bir doğrulama bağlantısı gönderdik.'} Bağlantıya
            dokunduktan sonra aşağıdaki düğmeyle devam edin.
          </Text>
        </View>
        <FormError message={failure?.message ?? null} />
        <Btn label="Doğruladım, devam et" onPress={complete} loading={submitting} testID="verify-submit" />
        <Btn label="Bağlantıyı tekrar gönder" variant="onDark" icon="refresh-cw" onPress={sendAgain} loading={resend.submitting} testID="verify-resend" />
        {resent ? (
          <Text style={[textStyles.caption, styles.ok]} accessibilityLiveRegion="polite">
            Doğrulama bağlantısı tekrar gönderildi. Gelen kutunuzu ve gereksiz klasörünü kontrol edin.
          </Text>
        ) : null}
        <FormError message={resend.failure?.message ?? null} testID="verify-resend-error" />
        <Text style={[textStyles.caption, styles.text]}>Yanlış e-postayla mı kaydoldunuz? Çıkış yapıp tekrar kayıt olabilirsiniz.</Text>
        <SignOutButton onDark testID="verify-sign-out" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing['3xl'] },
  body: { gap: spacing.lg },
  eyebrow: { color: colors.greenBright },
  title: { color: colors.white },
  text: { color: colors.bluePale },
  ok: { color: colors.greenBright },
});
