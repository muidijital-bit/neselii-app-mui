import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/session/SessionProvider';
import { isAuthLink, useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Logo } from '@/ui/Logo';
import { Text } from '@/ui/Text';
import { Colors, Fonts, Spacing } from '@/ui/theme';

import { FormError } from './AuthForm';
import { SignOutButton } from './SignOutButton';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * E-posta doğrulama (main'de karşılığı yoktur; tanıtım ekranlarının lacivert diliyle kurulur). Supabase'te e-posta doğrulaması şu an
 * KAPALI olduğundan normal akışta açılmaz; RootNavigator yalnız `emailVerified=false` oturumunu bu ekrana kilitler. Bağlantı uygulamayı
 * açarsa doğrulama kendiliğinden tamamlanır; başka cihazda açıldıysa "Doğruladım" hesabı yeniden denetler.
 */
export function VerifyEmailScreen() {
  const { auth } = useServices();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]} testID="verify-email-screen">
      <FocusStatusBar style="light" />
      <Logo height={36} />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>E-POSTA DOĞRULAMA</Text>
        <Text variant="display" style={styles.title} accessibilityRole="header">
          E-postanızı doğrulayın
        </Text>
        <Text variant="body" style={styles.text}>
          {session?.user.email ? `${session.user.email} adresine bir doğrulama bağlantısı gönderdik.` : 'E-posta adresinize bir doğrulama bağlantısı gönderdik.'} Bağlantıya
          dokunduktan sonra aşağıdaki düğmeyle devam edin.
        </Text>
      </View>
      <View style={styles.footer}>
        <FormError message={failure?.message ?? null} />
        <Button title="Doğruladım, devam et" onPress={() => void complete()} loading={submitting} testID="verify-submit" />
        <Button title="Bağlantıyı tekrar gönder" variant="outlineDark" icon="refresh-cw" onPress={() => void sendAgain()} loading={resend.submitting} testID="verify-resend" />
        {resent ? (
          <Text variant="caption" style={styles.ok} accessibilityLiveRegion="polite">
            Doğrulama bağlantısı tekrar gönderildi. Gelen kutunuzu ve gereksiz klasörünü kontrol edin.
          </Text>
        ) : null}
        <FormError message={resend.failure?.message ?? null} testID="verify-resend-error" />
        <SignOutButton onDark testID="verify-sign-out" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy, paddingHorizontal: Spacing.four, gap: Spacing.four },
  body: { flex: 1, justifyContent: 'flex-end', gap: Spacing.three },
  eyebrow: { fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1.4, color: Colors.orange },
  title: { color: Colors.white, fontSize: 32, lineHeight: 39 },
  text: { color: '#C9D5E5', fontSize: 17, lineHeight: 25 },
  footer: { gap: Spacing.three },
  ok: { color: Colors.greenSoft },
});
