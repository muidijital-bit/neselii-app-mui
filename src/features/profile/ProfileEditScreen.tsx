import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type TextInput as TextInputInstance, type TextInputProps } from 'react-native';

import { userMessage, type UserProfile } from '@/domain';
import { useAuthSubmit } from '@/features/auth/useAuthSubmit';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSession } from '@/features/session/SessionProvider';
import { useServices } from '@/services';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { profileSchema, type ProfileValues } from './profileSchema';
import { profileKeys, useProfileQuery } from './useProfileQueries';

const SERVER_FIELDS = ['fullName', 'phone'] as const;

const toValues = (profile: UserProfile): ProfileValues => ({ fullName: profile.fullName, phone: profile.phone ?? '' });

/**
 * Profil düzenleme (Profil Bilgilerim, main tasarımı): ad soyad ve isteğe bağlı telefon düzenlenir, e-posta (giriş bilgisi) SALT OKUNURDUR.
 * Yükleniyor / hata + "Tekrar dene" durumları vardır; form servisten gelen profille YALNIZCA bir kez doldurulur (sonraki yenilemeler
 * kullanıcının yazdığını ezmez). Kayıttan sonra ekranda kalınır ve "Bilgileriniz güncellendi." görünür.
 */
export function ProfileEditScreen() {
  const profile = useProfileQuery();

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="profile-edit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Profil Bilgilerim" testID="profile-edit-back" />
      {profile.isPending ? (
        <View style={styles.state} accessible accessibilityLabel="Profil yükleniyor" accessibilityState={{ busy: true }} testID="profile-edit-loading">
          <StateView loading />
        </View>
      ) : profile.isError ? (
        <View style={styles.state} testID="profile-edit-error">
          <StateView
            title="Profil yüklenemedi"
            message={userMessage(profile.error)}
            actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void profile.refetch() }]}
          />
        </View>
      ) : (
        <ProfileForm initial={profile.data} />
      )}
    </KeyboardAvoidingView>
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
  }, clearFailure); // doğrulama başarısız olsa da eski genel hata kalmasın

  // Kullanıcı yazmaya devam edince önceki başarı iletisi ve hata bandı kalkar (kayıt sonrası `reset` formu temiz yapar: isDirty false).
  const [fullName, phone] = useWatch({ control, name: ['fullName', 'phone'] });
  useEffect(() => {
    if (!isDirty) return;
    setSaved(false);
    clearFailure();
  }, [fullName, phone, isDirty, clearFailure]);
  const phoneRef = useRef<TextInputInstance>(null);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FormField
        control={control}
        name="fullName"
        label="Ad Soyad"
        autoComplete="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
        testID="profile-edit-name"
      />
      <View style={styles.readOnly}>
        <TextField label="E-posta" value={initial.email} editable={false} keyboardType="email-address" testID="profile-edit-email" />
        <Text variant="caption" testID="profile-edit-email-note">
          E-posta adresi giriş bilginizdir ve değiştirilemez.
        </Text>
      </View>
      <FormField
        ref={phoneRef}
        control={control}
        name="phone"
        label="Telefon (isteğe bağlı)"
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="05xx xxx xx xx"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
        testID="profile-edit-phone"
      />
      {saved && !isDirty ? (
        <View style={styles.success} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="profile-edit-saved">
          <Icon name="check-circle" size={20} color="success" />
          <Text variant="small" color="success" style={styles.flex}>
            Bilgileriniz güncellendi.
          </Text>
        </View>
      ) : null}
      {failure?.message ? (
        <Text variant="small" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite" testID="profile-edit-error-banner">
          {failure.message}
        </Text>
      ) : null}
      <Button title="Kaydet" disabled={!isDirty} loading={submitting} onPress={() => void onSubmit()} testID="profile-edit-save" />
    </ScrollView>
  );
}

type FormFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<ProfileValues>;
  name: keyof ProfileValues;
  label: string;
  ref?: Ref<TextInputInstance>;
};

/** react-hook-form alanı → `@/ui/TextField` (main görünümü); doğrulama iletisi alanın altında görünür. */
function FormField({ control, name, label, ...rest }: FormFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField label={label} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} {...rest} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  state: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  readOnly: { gap: Spacing.two },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
});
