import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { AppError, userMessage, type Advisor } from '@/domain';
import { PageHeader } from '@/features/notifications/PageHeader';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, ToggleRow } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { NEW_ADVISOR } from './routes';
import { useAdvisorMutations, useAdvisorQuery } from './useAdvisors';

/**
 * Yönetici: danışman ekle / düzenle / sil. `advisorId=new` yeni danışmandır. Pasif danışmana yeni talep atanmaz (mevcut talepleri kalır).
 * Silmede onay istenir; silinen danışmanın açık talepleri sunucuda başka bir aktif danışmana aktarılır.
 */
export function AdvisorEditScreen() {
  const { advisorId } = useLocalSearchParams<{ advisorId?: string | string[] }>();
  const id = typeof advisorId === 'string' ? advisorId.trim() : '';
  const isNew = id === NEW_ADVISOR;
  const query = useAdvisorQuery(isNew ? '' : id);

  let body;
  if (isNew) {
    body = <AdvisorForm initial={null} />;
  } else if (query.isPending) {
    body = <StateView loading />;
  } else if (query.isError) {
    body = (
      <StateView
        icon="alert-circle"
        title={query.error instanceof AppError && query.error.kind === 'notFound' ? 'Danışman bulunamadı' : 'Danışman yüklenemedi'}
        message={userMessage(query.error)}
        actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void query.refetch() }]}
      />
    );
  } else {
    body = <AdvisorForm initial={query.data} />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="advisor-edit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={isNew ? 'Yeni Danışman' : 'Danışmanı Düzenle'} testID="advisor-edit-back" />
      {body}
    </KeyboardAvoidingView>
  );
}

function AdvisorForm({ initial }: { initial: Advisor | null }) {
  const router = useRouter();
  const { save, remove } = useAdvisorMutations();
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [nameError, setNameError] = useState<string | undefined>();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/advisors'));

  const submit = () => {
    if (fullName.trim().length < 2) {
      setNameError('Danışmanın adını girin.');
      return;
    }
    setNameError(undefined);
    save.mutate(
      { id: initial?.id ?? null, input: { fullName, phone: phone.trim() || null, active } },
      {
        onSuccess: close,
        onError: (error) => {
          const message = error instanceof AppError ? error.fieldErrors?.fullName : undefined;
          if (message) setNameError(message);
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!initial) return;
    Alert.alert('Danışman silinsin mi?', `${initial.fullName} silinecek. Açık talepleri başka bir aktif danışmana aktarılır.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(initial.id, { onSuccess: close }) },
    ]);
  };

  const error = save.isError ? save.error : remove.isError ? remove.error : null;
  const showError = error && !(error instanceof AppError && error.fieldErrors?.fullName);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        label="Ad Soyad"
        value={fullName}
        onChangeText={(text) => {
          setFullName(text);
          if (nameError) setNameError(undefined);
        }}
        autoCapitalize="words"
        autoComplete="name"
        error={nameError}
        testID="advisor-name"
      />
      <TextField label="Telefon (isteğe bağlı)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" testID="advisor-phone" />
      <Card>
        <ToggleRow title="Aktif" subtitle="Pasif danışmana yeni talep atanmaz." value={active} onChange={setActive} />
      </Card>
      {showError ? (
        <Text variant="small" color="danger" accessibilityRole="alert" testID="advisor-error">
          {userMessage(error)}
        </Text>
      ) : null}
      <Button title="Kaydet" loading={save.isPending} disabled={remove.isPending} onPress={submit} testID="advisor-save" />
      {initial ? (
        <View style={styles.danger}>
          <Button title="Danışmanı Sil" icon="trash-2" variant="outline" loading={remove.isPending} disabled={save.isPending} onPress={confirmDelete} testID="advisor-delete" />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  danger: { marginTop: Spacing.three },
});
