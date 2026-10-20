import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { colors, fontFamily, spacing, textStyles } from '@/theme';

import { FormError, TextField } from './AuthForm';
import { FormScroll } from './FormScroll';
import { loginSchema, type LoginValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

/**
 * 01 Giriş: yalnızca e-posta + şifre (telefon/SMS girişi yok). Başarıda oturum `SessionProvider.setSession` ile kurulur;
 * yönlendirme (sekmeler ya da e-posta doğrulama) oradan türer. Parola yalnızca RHF belleğinde ve çağrı argümanındadır.
 */
export function LoginScreen() {
  const { auth } = useServices();
  const { setSession } = useSession();
  const insets = useSafeAreaInsets();
  const { submitting, failure, submit } = useAuthSubmit();
  const { control, handleSubmit, setError } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const result = await submit(() => auth.signIn({ email, password }), setSession);
    if (result?.fieldErrors.email) setError('email', { message: result.fieldErrors.email });
    if (result?.fieldErrors.password) setError('password', { message: result.fieldErrors.password });
  });

  return (
    <Screen background={colors.navy} statusBar="light" edges={['top', 'left', 'right']} testID="login-screen">
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <BrandLogo height={48} />
            <Text style={[textStyles.bodySmall, styles.lead]}>Firmamızın filosundan kamyon, çekici, dorse, otomobil ve iş makinesi ilanları.</Text>
          </View>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + spacing.md }]}>
            <Text style={[textStyles.titleLarge, styles.title]} accessibilityRole="header">
              Giriş Yap
            </Text>
            <TextField control={control} name="email" label="E-posta" type="email" autoComplete="email" returnKeyType="next" testID="login-email" />
            <TextField control={control} name="password" label="Şifre" type="password" autoComplete="password" returnKeyType="done" onSubmitEditing={onSubmit} testID="login-password" />
            <View style={styles.forgotRow}>
              <Link href="/forgot-password" accessibilityRole="link" style={[textStyles.bodySmall, styles.forgotLink]} testID="go-forgot-password">
                Şifremi unuttum
              </Link>
            </View>
            <FormError message={failure?.message ?? null} />
            <Btn label="Giriş Yap" onPress={onSubmit} loading={submitting} testID="login-submit" />
            <View style={styles.spacer} />
            <View style={styles.switchRow}>
              <Text style={[textStyles.bodySmall, styles.switchText]}>Hesabınız yok mu?</Text>
              <Link href="/register" accessibilityRole="link" style={[textStyles.bodySmall, styles.switchLink]} testID="go-register">
                Kayıt Ol
              </Link>
            </View>
          </View>
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// Değerler design/claude-design/AppScreen.dc.html (01): üst blok 36/24/40, tabaka 24 yarıçap, 28/20/12 iç boşluk, 16 aralık.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', gap: 18, paddingTop: 36, paddingHorizontal: spacing['3xl'], paddingBottom: 40 },
  lead: { maxWidth: 290, textAlign: 'center', color: colors.bluePale },
  sheet: {
    flex: 1,
    gap: spacing.xl,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingHorizontal: spacing['2xl'],
  },
  title: { color: colors.navy },
  spacer: { flex: 1 },
  forgotRow: { alignItems: 'flex-end', marginTop: -6 },
  forgotLink: { color: colors.blue, fontFamily: fontFamily.inter600, minHeight: 32, paddingTop: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  switchText: { color: colors.slate },
  switchLink: { color: colors.greenPressed, fontFamily: fontFamily.inter700, paddingVertical: 12, paddingHorizontal: 4 },
});
