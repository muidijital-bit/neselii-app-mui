import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/features/notifications/PageHeader';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { useDeleteAccount } from './useDeleteAccount';

const DELETED = [
  'Hesap bilgileriniz (ad soyad, e-posta, telefon)',
  'Favori ilanlarınız ve kayıtlı aramalarınız',
  'İlan görüşmeleriniz ve mesajlarınız',
  'Bildirimleriniz ve bildirim tercihleriniz',
] as const;

const NOTES = [
  'İşlem geri alınamaz. Silinen veriler kurtarılamaz.',
  'Aynı e-posta adresiyle daha sonra yeniden kayıt olabilirsiniz; ancak eski verileriniz geri gelmez.',
  'Silme işleminden sonra giriş ekranına yönlendirilirsiniz.',
] as const;

/**
 * Hesabımı Sil (main tasarımı). Silme sunucudaki `delete_my_account` işleviyle yapılır; hesaba bağlı kayıtlar yabancı anahtar zinciriyle silinir.
 * ONAYSIZ SİLİNMEZ: alttaki "Hesabımı Kalıcı Olarak Sil" yalnızca onay adımını açar (main'deki onay penceresinin metniyle, ekran içinde);
 * silme ikinci, ayrı "Hesabımı Sil" dokunuşuyla başlar. Vazgeçmek hiçbir şeyi değiştirmez. Başarıda oturum kapanır ve giriş ekranına dönülür
 * (bkz. `useDeleteAccount`); hatada hesap yerinde kalır, açık hata ve "Tekrar dene" görünür.
 */
export function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { deleteAccount, deleting, failure, clearFailure } = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);

  const cancelConfirm = () => {
    clearFailure();
    setConfirming(false);
  };

  return (
    <View style={styles.container} testID="delete-account-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Hesabımı Sil" testID="delete-account-back" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="delete-account-scroll">
        <View testID="delete-account-scope">
          <Card style={styles.card}>
            <Text variant="heading" accessibilityRole="header">
              Silinecekler
            </Text>
            {DELETED.map((item) => (
              <Row key={item} icon="trash-2" color="danger" text={item} />
            ))}
          </Card>
        </View>
        <View testID="delete-account-limits">
          <Card style={styles.card}>
            <Text variant="heading" accessibilityRole="header">
              Bilmeniz gerekenler
            </Text>
            {NOTES.map((item) => (
              <Row key={item} icon="info" color="heading" text={item} />
            ))}
          </Card>
        </View>
        {confirming ? (
          <View accessibilityLiveRegion="polite" testID="delete-account-confirm">
            <Card style={[styles.card, styles.confirm]}>
              <Text variant="heading" color="danger" accessibilityRole="header">
                Hesabınız kalıcı olarak silinecek
              </Text>
              <Text variant="body" color="textSecondary">
                Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
              </Text>
              {failure ? (
                <Text variant="small" color="danger" accessibilityRole="alert" testID="delete-account-error">
                  {`Hesap silinemedi. ${failure.message ?? ''}`.trim()}
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        {confirming ? (
          <>
            <Button
              title={failure ? 'Tekrar dene' : 'Hesabımı Sil'}
              variant="danger"
              icon="trash-2"
              loading={deleting}
              onPress={() => void deleteAccount()}
              testID="delete-account-confirm-button"
            />
            <Button title="Vazgeç" variant="outline" disabled={deleting} onPress={cancelConfirm} testID="delete-account-cancel" />
          </>
        ) : (
          <Button title="Hesabımı Kalıcı Olarak Sil" variant="danger" icon="trash-2" onPress={() => setConfirming(true)} testID="delete-account-start" />
        )}
      </View>
    </View>
  );
}

function Row({ icon, color, text }: { icon: IconName; color: 'danger' | 'heading'; text: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={22} color={color} style={styles.rowIcon} />
      <Text variant="body" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  card: { padding: Spacing.four, gap: Spacing.three },
  confirm: { borderColor: Colors.danger, borderWidth: 1.5 },
  row: { flexDirection: 'row', gap: Spacing.three },
  rowIcon: { marginTop: 1 },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two + 4, backgroundColor: Colors.background },
});
