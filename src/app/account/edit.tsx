import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile, useUpdateProfile } from '@/features/profile/api';
import { useAuth } from '@/providers/auth-provider';

export default function EditProfileScreen() {
  const profile = useProfile();

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title="Profil Bilgilerim" />
      {profile.data ? (
        <ProfileForm initialName={profile.data.full_name ?? ''} initialPhone={profile.data.phone ?? ''} />
      ) : (
        <StateView loading={profile.isLoading} title={profile.isError ? 'Profil yüklenemedi' : undefined} />
      )}
    </KeyboardAvoidingView>
  );
}

function ProfileForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const { session } = useAuth();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);

  const dirty = fullName.trim() !== initialName || phone.trim() !== initialPhone;
  const valid = fullName.trim().length >= 2;

  const onSave = () =>
    update.mutate(
      { full_name: fullName.trim(), phone: phone.trim() || null },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Kaydedilemedi', e.message),
      },
    );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Ad Soyad" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <TextField
        label="E-posta"
        value={session?.user.email ?? ''}
        editable={false}
        helper="E-posta adresi giriş bilginizdir ve değiştirilemez."
      />
      <TextField
        label="Telefon (isteğe bağlı)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="05xx xxx xx xx"
      />
      <Button title="Kaydet" disabled={!dirty || !valid} loading={update.isPending} onPress={onSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
});
