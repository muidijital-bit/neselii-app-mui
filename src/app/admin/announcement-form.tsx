import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { useAdminAnnouncements, useDeleteAnnouncement, useSaveAnnouncement } from '@/features/admin/api';
import type { AnnouncementRow } from '@/types/database';

export default function AnnouncementFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const announcements = useAdminAnnouncements();
  const existing = id ? announcements.data?.find((a) => a.id === id) : undefined;

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScreenHeader title={id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'} />
      {id && !existing ? (
        <StateView loading={announcements.isLoading} title={announcements.isLoading ? undefined : 'Duyuru bulunamadı'} />
      ) : (
        <AnnouncementForm key={id ?? 'new'} id={id} initial={existing} />
      )}
    </KeyboardAvoidingView>
  );
}

function AnnouncementForm({ id, initial }: { id?: string; initial?: AnnouncementRow }) {
  const save = useSaveAnnouncement();
  const remove = useDeleteAnnouncement();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const published = !!initial?.published_at;
  const valid = title.trim().length > 2 && body.trim().length > 5;

  const submit = (publish: boolean) =>
    save.mutate(
      {
        id,
        input: {
          title: title.trim(),
          body: body.trim(),
          published_at: publish ? (initial?.published_at ?? new Date().toISOString()) : null,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Duyuru kaydedilemedi', e.message),
      },
    );

  const confirmPublish = () =>
    published
      ? submit(true)
      : Alert.alert('Duyuruyu yayımla', 'Duyuru bildirimini açan tüm kullanıcılara bildirim gönderilecek.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Yayımla', onPress: () => submit(true) },
        ]);

  const confirmDelete = () =>
    id &&
    Alert.alert('Duyuruyu sil', 'Duyuru ve ona bağlı bildirimler silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => remove.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Ör. Sincan şubemiz hizmete açıldı" />
      <TextField
        label="Metin"
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        style={styles.multiline}
      />
      {published ? (
        <Text variant="small">Bu duyuru yayında. Değişiklikler yeniden bildirim göndermez.</Text>
      ) : null}
      <Button
        title={published ? 'Kaydet' : 'Yayımla'}
        icon={published ? undefined : 'send'}
        disabled={!valid}
        loading={save.isPending}
        onPress={confirmPublish}
      />
      <Button
        title={published ? 'Yayından Kaldır' : 'Taslak Olarak Kaydet'}
        variant="outline"
        disabled={!valid || save.isPending}
        onPress={() => submit(false)}
      />
      {id ? <Button title="Sil" variant="outline" icon="trash-2" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.three, gap: Spacing.three },
  multiline: { minHeight: 180, paddingTop: Spacing.three },
});
