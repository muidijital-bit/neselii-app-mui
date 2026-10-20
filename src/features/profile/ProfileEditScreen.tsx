import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { userMessage, type UserProfile } from '@/domain';
import { FormError, TextField } from '@/features/auth/AuthForm';
import { FormScroll } from '@/features/auth/FormScroll';
import { useAuthSubmit } from '@/features/auth/useAuthSubmit';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { colors, radii, spacing, textStyles } from '@/theme';

import { profileSchema, type ProfileValues } from './profileSchema';
import { profileKeys, useProfileQuery } from './useProfileQueries';

const SERVER_FIELDS = ['fullName', 'phone'] as const;

const toValues = (profile: UserProfile): ProfileValues => ({ fullName: profile.fullName, phone: profile.phone ?? '' });

/**
 * Profil düzenleme (Profil Bilgilerim): ad soyad ve isteğe bağlı telefon düzenlenir, e-posta (giriş bilgisi) SALT OKUNURDUR. Ekran
 * kaynakta tam tasarımı olmayan tamamlayıcı ekrandır (docs/PRODUCT.md): kayıt ekranıyla aynı başlık/alan/buton bileşenleri kullanılır.
 * Yükleniyor / hata + "Tekrar dene" durumları vardır; form servisten gelen profille YALNIZCA bir kez doldurulur (sonraki yenilemeler
 * kullanıcının yazdığını ezmez).
 */
export function ProfileEditScreen() {
  const profile = useProfileQuery();

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} background={colors.white} testID="profile-edit-screen">
      <PageHeader title="Profil Bilgilerim" testID="profile-edit-back" />
      {profile.isPending ? (
        <View style={styles.loading} accessible accessibilityLabel="Profil yükleniyor" accessibilityState={{ busy: true }} testID="profile-edit-loading">
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.skeletonField}>
              <View style={[styles.bar, { width: 90, height: 12 }]} />
              <View style={[styles.bar, { width: '100%', height: 52, borderRadius: radii.xl }]} />
            </View>
          ))}
        </View>
      ) : profile.isError ? (
        <StateMessage icon="info" title="Profil yüklenemedi" message={userMessage(profile.error)} actionLabel="Tekrar dene" onAction={() => void profile.refetch()} testID="profile-edit-error" />
      ) : (
        <ProfileForm initial={profile.data} />
      )}
    </Screen>
  );
}

function ProfileForm({ initial }: { initial: UserProfile }) {
  const { profile: profileService } = useServices();
  const { setSession } = useSession();
  const queryClient = useQueryClient();
  const { submitting, failure, submit, clearFailure } = useAuthSubmit();
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: toValues(initial) });

  const onSubmit = handleSubmit(async ({ fullName, phone }) => {
    setSaved(false);
    // Kayıt başarıyla bitince ve oturum hâlâ aynıysa (çıkış / başka hesap değilse): oturumdaki kullanıcıyı güncelle (Profil özeti buradan okur),
    // form kaydedilen değerle "temiz" duruma geçer. Hata durumunda hiçbir şey sıfırlanmaz: yazılanlar formda KALIR ve yeniden denenebilir.
    const result = await submit(
      () => profileService.updateProfile({ fullName, phone: phone.trim() === '' ? null : phone }),
      (updated) => {
        setSession({ user: updated });
        queryClient.setQueryData(profileKeys.detail(updated.id), updated);
        reset(toValues(updated));
        setSaved(true);
      },
    );
    if (!result) return;
    for (const name of SERVER_FIELDS) {
      const message = result.fieldErrors[name];
      if (message) setError(name, { message });
    }
  });

  // Kullanıcı yazmaya devam edince önceki başarı iletisi ve hata bandı kalkar (kayıt sonrası `reset` formu temiz yapar: isDirty false).
  const [fullName, phone] = useWatch({ control, name: ['fullName', 'phone'] });
  useEffect(() => {
    if (!isDirty) return;
    setSaved(false);
    clearFailure();
  }, [fullName, phone, isDirty, clearFailure]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" enabled={Platform.OS === 'ios'}>
      <FormScroll contentContainerStyle={styles.form}>
        <TextField control={control} name="fullName" label="Ad Soyad" autoComplete="name" returnKeyType="next" testID="profile-edit-name" />
        <View style={styles.readOnly}>
          <Field label="E-posta" type="email" value={initial.email} editable={false} testID="profile-edit-email" />
          <Text style={[textStyles.caption, styles.readOnlyNote]} testID="profile-edit-email-note">
            E-posta adresi giriş bilginizdir ve değiştirilemez.
          </Text>
        </View>
        <TextField
          control={control}
          name="phone"
          label="Telefon (isteğe bağlı)"
          type="tel"
          autoComplete="tel"
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
          testID="profile-edit-phone"
        />
        {saved && !isDirty ? (
          <View style={styles.success} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="profile-edit-saved">
            <Icon name="circle-check" size={18} color={colors.green} />
            <Text style={[textStyles.bodySmall, styles.successText]}>Bilgileriniz güncellendi.</Text>
          </View>
        ) : null}
        <FormError message={failure?.message ?? null} testID="profile-edit-error-banner" />
        <Btn label="Kaydet" onPress={() => void onSubmit()} loading={submitting} disabled={!isDirty} testID="profile-edit-save" />
      </FormScroll>
    </KeyboardAvoidingView>
  );
}

// Tamamlayıcı ekran: değerler kayıt ekranıyla (02) aynı — form 16/20 iç boşluk, 12 aralık, alan 52, buton 52.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  readOnly: { gap: 6 },
  readOnlyNote: { color: colors.slateLight },
  success: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.greenBorder, backgroundColor: colors.greenSoft },
  successText: { flex: 1, color: colors.greenText },
  loading: { paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  skeletonField: { gap: 6 },
  bar: { borderRadius: radii.xs, backgroundColor: colors.lineSoft },
});
