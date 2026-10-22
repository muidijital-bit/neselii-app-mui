import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useController, useForm, useWatch, type Control } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type TextInput as TextInputInstance } from 'react-native';

import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { FormError, StrengthMeter, TextField, useClearFailureOnEdit } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { REGISTER_DEFAULTS, registerSchema, type RegisterValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

const SERVER_FIELDS = ['fullName', 'email', 'phone', 'password'] as const;

/**
 * 02 Kayıt: ad soyad, e-posta, isteğe bağlı telefon (iletişim alanı), şifre + tekrar, onay kutusu. Başarıda oturum açılır ve
 * kullanıcı doğrudan sekmelere geçer (Supabase'te e-posta doğrulaması kapalı; ekranda doğrulama metni yoktur).
 */
export function RegisterScreen() {
  const { auth } = useServices();
  const { setSession } = useSession();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();
  const { control, handleSubmit, setError, subscribe } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: REGISTER_DEFAULTS,
  });
  const [password, passwordConfirm, consent] = useWatch({ control, name: ['password', 'passwordConfirm', 'consent'] });
  // Tasarımdaki gibi tekrar alanı yazılırken eşleşmeme anında gösterilir (gönderimde şema da denetler).
  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  useClearFailureOnEdit(subscribe, clearFailure); // alan düzenlenince eski sunucu hatası kalkar
  // Klavyedeki "İleri" sıradaki alana geçer; son alanda onay verilmişse gönderir (verilmemişse yalnız klavye kapanır).
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  // Doğrulama başarısız olsa da yeni deneme eski genel hatayı (ör. "E-posta veya şifre hatalı.") temizler; geçerli gönderimde `submit` temizler.
  const onSubmit = handleSubmit(async ({ fullName, email, phone, password: pass }) => {
    const result = await submit(() => auth.signUp({ fullName, email, phone: phone.trim() === '' ? undefined : phone, password: pass }), setSession);
    if (!result) return;
    for (const name of SERVER_FIELDS) {
      const message = result.fieldErrors[name];
      if (message) setError(name, { message });
    }
  }, clearFailure);

  return (
    <View style={styles.container} testID="register-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Hesap Oluştur" testID="register-back" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.content}>
          <TextField
            control={control}
            name="fullName"
            label="Ad Soyad"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            testID="register-name"
          />
          <TextField
            ref={emailRef}
            control={control}
            name="email"
            label="E-posta"
            type="email"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            testID="register-email"
          />
          <TextField
            ref={phoneRef}
            control={control}
            name="phone"
            label="Telefon (isteğe bağlı)"
            type="tel"
            autoComplete="tel"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="register-phone"
          />
          <TextField
            ref={passwordRef}
            control={control}
            name="password"
            label="Şifre"
            type="password"
            autoComplete="new-password"
            returnKeyType="next"
            hint="En az 8 karakter; büyük harf, rakam ve sembol şifrenizi güçlendirir."
            onSubmitEditing={() => confirmRef.current?.focus()}
            testID="register-password"
          />
          <StrengthMeter password={password} />
          <TextField
            ref={confirmRef}
            control={control}
            name="passwordConfirm"
            label="Şifre (Tekrar)"
            type="password"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={consent ? () => void onSubmit() : undefined}
            liveError={mismatch ? 'Şifreler eşleşmiyor.' : undefined}
            testID="register-password-confirm"
          />
          <ConsentRow control={control} />
          <FormError message={failure?.message ?? null} />
          <Button title="Kayıt Ol" disabled={!consent} loading={submitting} onPress={() => void onSubmit()} testID="register-submit" />
        </FormScroll>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Onay metni (main ile aynı). DİKKAT: yayımlanmış bir Kullanım Koşulları / KVKK Aydınlatma Metni henüz YOKTUR (bkz. Gizlilik ve Güvenlik
 * ekranı); yayından önce bu belgeler yayımlanmalı ve metne bağlantıları eklenmelidir.
 */
export const CONSENT_TEXT = 'Kullanım koşullarını ve KVKK aydınlatma metnini okudum, kabul ediyorum.';

function ConsentRow({ control }: { control: Control<RegisterValues> }) {
  const { field, fieldState } = useController({ control, name: 'consent' });
  const checked = field.value;
  return (
    <View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={CONSENT_TEXT}
        onPress={() => field.onChange(!checked)}
        style={styles.checkRow}
        testID="register-consent">
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>{checked ? <Icon name="check" size={18} color="white" /> : null}</View>
        <Text variant="body" style={styles.flex}>
          {CONSENT_TEXT}
        </Text>
      </Pressable>
      {fieldState.error ? (
        <Text variant="caption" color="danger" accessibilityRole="alert">
          {fieldState.error.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  flex: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginVertical: Spacing.two },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.green, borderColor: Colors.green },
});
