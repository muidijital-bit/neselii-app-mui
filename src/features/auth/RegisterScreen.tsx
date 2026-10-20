import { zodResolver } from '@hookform/resolvers/zod';
import { useController, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { passwordStrength } from '@/domain';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { colors, spacing, textStyles } from '@/theme';

import { FormError, StrengthMeter, TextField } from './AuthForm';
import { FormScroll } from './FormScroll';
import { PageHeader } from './PageHeader';
import { REGISTER_DEFAULTS, registerSchema, type RegisterValues } from './authSchemas';
import { useAuthSubmit } from './useAuthSubmit';

const SERVER_FIELDS = ['fullName', 'email', 'phone', 'password'] as const;

/**
 * 02 Kayıt: ad soyad, e-posta, isteğe bağlı telefon (iletişim alanı), şifre + tekrar, onay kutusu. Başarıda oturum açılır ama
 * `emailVerified=false` olduğundan RootNavigator kullanıcıyı sekmeler yerine e-posta doğrulama ekranına yönlendirir.
 */
export function RegisterScreen() {
  const { auth } = useServices();
  const { setSession } = useSession();
  const { submitting, failure, submit } = useAuthSubmit();
  const { control, handleSubmit, setError } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: REGISTER_DEFAULTS,
  });
  const [password, passwordConfirm, consent] = useWatch({ control, name: ['password', 'passwordConfirm', 'consent'] });
  const strength = passwordStrength(password);
  const passwordsMatch = passwordConfirm !== '' && passwordConfirm === password;

  const onSubmit = handleSubmit(async ({ fullName, email, phone, password: pass }) => {
    const result = await submit(() => auth.signUp({ fullName, email, phone: phone.trim() === '' ? undefined : phone, password: pass }), setSession);
    if (!result) return;
    for (const name of SERVER_FIELDS) {
      const message = result.fieldErrors[name];
      if (message) setError(name, { message });
    }
  });

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} background={colors.white} testID="register-screen">
      <PageHeader title="Hesap Oluştur" testID="register-back" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
        <FormScroll contentContainerStyle={styles.form}>
          <TextField control={control} name="fullName" label="Ad Soyad" autoComplete="name" returnKeyType="next" testID="register-name" />
          <TextField control={control} name="email" label="E-posta" type="email" autoComplete="email" returnKeyType="next" testID="register-email" />
          <TextField control={control} name="phone" label="Telefon (isteğe bağlı)" type="tel" autoComplete="tel" returnKeyType="next" testID="register-phone" />
          <View style={styles.passwordGroup}>
            <TextField control={control} name="password" label="Şifre" type="password" autoComplete="new-password" returnKeyType="next" testID="register-password" />
            <StrengthMeter level={strength.level} label={strength.label} />
          </View>
          <TextField
            control={control}
            name="passwordConfirm"
            label="Şifre (Tekrar)"
            type="password"
            autoComplete="new-password"
            returnKeyType="done"
            okHint={passwordsMatch ? 'Şifreler eşleşiyor' : null}
            testID="register-password-confirm"
          />
          <ConsentRow control={control} />
          <FormError message={failure?.message ?? null} />
          <Btn label="Kayıt Ol" onPress={onSubmit} loading={submitting} disabled={!consent} testID="register-submit" />
          <Text style={[textStyles.caption, styles.note]}>Kayıt sonrası e-posta adresinize bir doğrulama bağlantısı gönderilir.</Text>
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Onay metni (019): yayımlanmış bir Aydınlatma Metni / Kullanım Koşulları henüz YOKTUR (bkz. Gizlilik ve Güvenlik ekranı); onay, var olmayan bir
 * hukuki belgeyi kabul etmek değil, bilgilerin hangi amaçla kullanıldığının anlaşıldığıdır. Yayın öncesi Aydınlatma Metni bağlantısı eklenmeli.
 */
export const CONSENT_TEXT = 'Bilgilerimin üyelik hesabım ve ilanlarla ilgili iletişim için kullanılacağını anladım.';

function ConsentRow({ control }: { control: import('react-hook-form').Control<RegisterValues> }) {
  const { field, fieldState } = useController({ control, name: 'consent' });
  const checked = field.value;
  return (
    <View style={styles.consentWrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={CONSENT_TEXT}
        onPress={() => field.onChange(!checked)}
        style={styles.consent}
        testID="register-consent">
        <View style={[styles.box, checked ? styles.boxChecked : styles.boxIdle]}>{checked ? <Icon name="check" size={16} color={colors.white} /> : null}</View>
        <Text style={[textStyles.caption, styles.consentText]}>{CONSENT_TEXT}</Text>
      </Pressable>
      {fieldState.error ? (
        <Text style={[textStyles.caption, styles.consentError]} accessibilityRole="alert">
          {fieldState.error.message}
        </Text>
      ) : null}
    </View>
  );
}

// Değerler design/claude-design/AppScreen.dc.html (02): üst çubuk 56, form 16/20 iç boşluk ve 12 aralık, şifre gücü 4 çubuk.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  passwordGroup: { gap: spacing.md },
  consentWrap: { gap: spacing.xs },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.sm },
  box: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: colors.green },
  boxIdle: { borderWidth: 2, borderColor: colors.slateFaint },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19.5, color: colors.inkMuted },
  consentError: { color: colors.danger },
  note: { textAlign: 'center', color: colors.slateLight },
});
