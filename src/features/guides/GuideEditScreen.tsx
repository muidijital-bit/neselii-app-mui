import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { AppError, SECTORS, userMessage, type Guide, type SectorId } from '@/domain';
import { PageHeader } from '@/features/notifications/PageHeader';
import { AdminBadge } from '@/features/session/AdminBadge';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip, ToggleRow } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { NEW_GUIDE, GUIDES_HREF } from './routes';
import { useGuideMutations, useGuideQuery } from './useGuides';

/** Madde 46 (yönetici): rehber yazısı ekle / düzenle / sil. Sektör seçilmezse genel yazıdır; "Yayında" kapalıysa taslak (müşteri görmez). */
export function GuideEditScreen() {
  const { guideId } = useLocalSearchParams<{ guideId?: string | string[] }>();
  const id = typeof guideId === 'string' ? guideId : '';
  const isNew = id === NEW_GUIDE;
  const query = useGuideQuery(isNew ? '' : id);
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" testID="guide-edit-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title={isNew ? 'Yeni Rehber Yazısı' : 'Yazıyı Düzenle'} testID="guide-edit-back" right={<AdminBadge />} />
      {isNew ? <GuideForm initial={null} /> : query.isPending ? <StateView loading /> : query.data ? <GuideForm initial={query.data} /> : <StateView title="Yazı bulunamadı" message={userMessage(query.error)} />}
    </KeyboardAvoidingView>
  );
}

function GuideForm({ initial }: { initial: Guide | null }) {
  const router = useRouter();
  const { save, remove } = useGuideMutations();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [sector, setSector] = useState<SectorId | null>(initial?.sector ?? null);
  const [published, setPublished] = useState(initial?.published ?? false);
  const errors = save.error instanceof AppError ? save.error.fieldErrors : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Başlık" value={title} onChangeText={setTitle} maxLength={140} error={errors?.title} testID="guide-title" />
      <View style={styles.group}>
        <Text variant="smallMedium" color="textSecondary">
          Sektör
        </Text>
        <View style={styles.wrap}>
          <Chip label="Genel (tüm sektörler)" selected={sector === null} onPress={() => setSector(null)} />
          {SECTORS.map((s) => (
            <Chip key={s.id} label={s.label} selected={sector === s.id} onPress={() => setSector(s.id)} />
          ))}
        </View>
      </View>
      <TextField label="Yazı" value={body} onChangeText={setBody} multiline style={styles.body} error={errors?.body} placeholder="Paragraflar arasında boş satır bırakabilirsiniz." testID="guide-body" />
      <Card>
        <ToggleRow title="Yayında" subtitle="Kapalıyken yazı taslaktır; müşteriler göremez." value={published} onChange={setPublished} />
      </Card>
      {save.isError && !errors ? (
        <Text variant="small" color="danger">
          {userMessage(save.error)}
        </Text>
      ) : null}
      <Button
        title="Kaydet"
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            { id: initial?.id ?? null, input: { title, body, sector, published } },
            { onSuccess: () => (router.canGoBack() ? router.back() : router.replace(GUIDES_HREF)) },
          )
        }
        testID="guide-save"
      />
      {initial ? (
        <Button
          title="Yazıyı Sil"
          icon="trash-2"
          variant="outline"
          loading={remove.isPending}
          onPress={() =>
            Alert.alert('Yazı silinsin mi?', initial.title, [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(initial.id, { onSuccess: () => router.replace(GUIDES_HREF) }) },
            ])
          }
          testID="guide-delete"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  group: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  body: { minHeight: 220, paddingVertical: Spacing.two, textAlignVertical: 'top' },
});
