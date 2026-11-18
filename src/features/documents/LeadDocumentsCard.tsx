import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppError, DOCUMENT_KIND_LABELS, DOCUMENT_KINDS, userMessage, type DocumentKind, type Lead, type LocalFile } from '@/domain';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Card, Chip, Divider } from '@/ui/Ui';
import { Spacing } from '@/ui/theme';

import { DocumentRow } from './DocumentRow';
import { quoteHref } from './routes';
import { useDocumentMutations, useLeadDocuments } from './useDocuments';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- yerel modül yalnız belge seçilirken yüklenir
const documentPicker = () => require('expo-document-picker') as typeof import('expo-document-picker');

/**
 * Talep detayında "Belgeler" (madde 52, 32). Müşteri talebine gönderilen belgeleri görür. Yönetici ayrıca: **Teklif Oluştur** (PDF teklif ekranı)
 * ve **Belge Yükle** (PDF / görsel seç, tür ve ad ver → müşterinin Belgelerim'ine düşer, bildirim gider) ve belge silme.
 */
export function LeadDocumentsCard({ lead, isAdmin }: { lead: Lead; isAdmin: boolean }) {
  const router = useRouter();
  const docs = useLeadDocuments(lead.id);
  const { upload, remove } = useDocumentMutations();
  const [file, setFile] = useState<LocalFile | null>(null);
  const [kind, setKind] = useState<DocumentKind>('expertise');
  const [title, setTitle] = useState('');
  const titleError = upload.error instanceof AppError ? upload.error.fieldErrors?.title : undefined;

  const items = docs.data ?? [];
  if (!isAdmin && items.length === 0) return null;

  const pick = async () => {
    const result = await documentPicker().getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if ((asset.size ?? 0) > 20 * 1024 * 1024) {
      Alert.alert('Dosya çok büyük', 'Belge en fazla 20 MB olabilir.');
      return;
    }
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
    if (!title) setTitle(asset.name.replace(/\.[^.]+$/, ''));
  };

  const confirmRemove = (id: string, docTitle: string) =>
    Alert.alert('Belge silinsin mi?', `${docTitle} müşterinin belgelerinden kaldırılacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  return (
    <Card style={styles.card}>
      <Text variant="subheading">Belgeler{items.length ? ` (${items.length})` : ''}</Text>
      {items.map((doc, i) => (
        <View key={doc.id}>
          {i > 0 ? <Divider /> : null}
          <DocumentRow doc={doc} onRemove={isAdmin ? () => confirmRemove(doc.id, doc.title) : undefined} />
        </View>
      ))}
      {isAdmin ? (
        <View style={styles.admin}>
          <Button title="Teklif Oluştur (PDF)" icon="file-plus" variant="navy" onPress={() => router.push(quoteHref(lead.id))} testID="lead-create-quote" />
          <Divider />
          <Text variant="smallMedium" color="textSecondary">
            Belge yükle
          </Text>
          <Button title={file ? file.name : 'Dosya Seç (PDF / görsel)'} icon="paperclip" variant="outline" onPress={() => void pick()} testID="lead-document-pick" />
          {file ? (
            <>
              <View style={styles.wrap}>
                {DOCUMENT_KINDS.map((value) => (
                  <Chip key={value} label={DOCUMENT_KIND_LABELS[value]} selected={kind === value} onPress={() => setKind(value)} />
                ))}
              </View>
              <TextField label="Belge adı" value={title} onChangeText={setTitle} maxLength={120} error={titleError} testID="lead-document-title" />
              <Button
                title="Müşteriye Gönder"
                icon="send"
                loading={upload.isPending}
                onPress={() =>
                  upload.mutate(
                    { customerId: lead.customer.id, leadId: lead.id, kind, title, file },
                    {
                      onSuccess: () => {
                        setFile(null);
                        setTitle('');
                      },
                    },
                  )
                }
                testID="lead-document-upload"
              />
            </>
          ) : null}
          {upload.isError && !titleError ? (
            <Text variant="small" color="danger">
              {userMessage(upload.error)}
            </Text>
          ) : null}
          <View style={styles.hint}>
            <Icon name="info" size={14} color="textSecondary" />
            <Text variant="caption" style={styles.flex}>
              Belge müşterinin Profil → Belgelerim ekranına düşer ve bildirim gider.
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.two },
  admin: { gap: Spacing.two, marginTop: Spacing.one },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  hint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1 },
});
