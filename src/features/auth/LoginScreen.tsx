import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type TextInput as TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePhotoWallQuery } from '@/features/listings/useListingsQueries';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Logo } from '@/ui/Logo';
import { PhotoWall } from '@/ui/PhotoWall';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FormError, TextField, useClearFailureOnEdit } from './AuthForm';
import { FormScroll } from './FormScroll';
import { loginSchema, type LoginValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

const HERO_HEIGHT = 330;

/**
 * 01 Giriş: yalnızca e-posta + şifre (telefon/SMS girişi yok). Başarıda oturum `SessionProvider.setSession` ile kurulur;
 * yönlendirme oradan türer. Parola yalnızca RHF belleğinde ve çağrı argümanındadır.
 */
export function LoginScreen() {
  const { auth } = useServices();
  const { setSession } = useSession();
  const insets = useSafeAreaInsets();
  const photos = usePhotoWallQuery();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();
  const { control, handleSubmit, setError, subscribe } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  // İki alan da dolmadan buton pasif görünür (biçim hataları yine gönderimde gösterilir).
  const [email, password] = useWatch({ control, name: ['email', 'password'] });
  const filled = email.trim() !== '' && password !== '';
  // Alan düzenlenince eski sunucu hatası hemen kalkar (alan boşalıp buton pasifleşse bile "E-posta girin." ile yan yana kalmaz).
  useClearFailureOnEdit(subscribe, clearFailure);
  const passwordRef = useRef<TextInputInstance>(null);

  // Doğrulama başarısız olsa da yeni deneme eski genel hatayı (ör. "E-posta veya şifre hatalı.") temizler; geçerli gönderimde `submit` temizler.
  const onSubmit = handleSubmit(async ({ email, password }) => {
    // Klavyeden gönderimde odak alanda kalırsa Android, giriş ekranı kalkınca odağı ana sayfadaki arama kutusuna devreder.
    Keyboard.dismiss();
    const result = await submit(() => auth.signIn({ email, password }), setSession);
    if (result?.fieldErrors.email) setError('email', { message: result.fieldErrors.email });
    if (result?.fieldErrors.password) setError('password', { message: result.fieldErrors.password });
  }, clearFailure);

  return (
    // Android'de klavye boşluğunu FormScroll verir; KeyboardAvoidingView yalnız iOS'ta çalışır.
    <KeyboardAvoidingView style={styles.container} behavior="padding" enabled={Platform.OS === 'ios'} testID="login-screen">
      <FocusStatusBar style="light" />
      <FormScroll contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { paddingTop: insets.top + Spacing.five, minHeight: insets.top + HERO_HEIGHT }]}>
          <PhotoWall photos={photos.data ?? []} height={insets.top + HERO_HEIGHT + 40} style={styles.wall} dim={0.6} />
          <Logo height={64} />
          <Text variant="body" align="center" style={styles.tagline}>
            Firmamızın filosundan kamyon, çekici, dorse ve ticari araç ilanları.
          </Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
          <Text variant="title" accessibilityRole="header">
            Giriş Yap
          </Text>
          <TextField
            control={control}
            name="email"
            label="E-posta"
            type="email"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="login-email"
          />
          <TextField
            ref={passwordRef}
            control={control}
            name="password"
            label="Şifre"
            type="password"
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            testID="login-password"
          />
          <Link href="/forgot-password" asChild>
            <Pressable hitSlop={8} accessibilityRole="link" style={styles.forgot} testID="go-forgot-password">
              <Text variant="bodySemibold" color="heading">
                Şifremi unuttum
              </Text>
            </Pressable>
          </Link>
          <FormError message={failure?.message ?? null} />
          <Button title="Giriş Yap" loading={submitting} disabled={!filled} onPress={() => void onSubmit()} testID="login-submit" />
          <View style={styles.signUp}>
            <Text variant="body" color="textSecondary">
              Hesabınız yok mu?
            </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={8} accessibilityRole="link" testID="go-register">
                <Text variant="bodySemibold" color="green">
                  Kayıt Ol
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </FormScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five + Spacing.three,
  },
  wall: { position: 'absolute', top: 0, left: 0, right: 0 },
  tagline: { color: '#D5DEEA', fontSize: 17, lineHeight: 26 },
  sheet: {
    flexGrow: 1,
    marginTop: -Spacing.four,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl + 12,
    borderTopRightRadius: Radius.xl + 12,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  forgot: { alignSelf: 'flex-end' },
  signUp: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
});
