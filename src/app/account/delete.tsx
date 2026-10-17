import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useDeleteAccount } from '@/features/profile/api';

const deleted = [
  'Hesap bilgileriniz (ad soyad, e-posta, telefon)',
  'Favori ilanlarınız ve kayıtlı aramalarınız',
  'İlan görüşmeleriniz ve mesajlarınız',
  'Bildirimleriniz ve bildirim tercihleriniz',
];

const notes = [
  'İşlem geri alınamaz. Silinen veriler kurtarılamaz.',
  'Aynı e-posta adresiyle daha sonra yeniden kayıt olabilirsiniz; ancak eski verileriniz geri gelmez.',
  'Silme işleminden sonra giriş ekranına yönlendirilirsiniz.',
];

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const deleteAccount = useDeleteAccount();

  const confirm = () =>
    Alert.alert(
      'Hesabınız kalıcı olarak silinecek',
      'Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: () =>
            deleteAccount.mutate(undefined, {
              onError: (e) => Alert.alert('Hesap silinemedi', e.message),
            }),
        },
      ],
    );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Hesabımı Sil" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text variant="heading">Silinecekler</Text>
          {deleted.map((item) => (
            <Row key={item} icon="trash-2" color="danger" text={item} />
          ))}
        </Card>
        <Card style={styles.card}>
          <Text variant="heading">Bilmeniz gerekenler</Text>
          {notes.map((item) => (
            <Row key={item} icon="info" color="heading" text={item} />
          ))}
        </Card>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button
          title="Hesabımı Kalıcı Olarak Sil"
          variant="danger"
          icon="trash-2"
          loading={deleteAccount.isPending}
          onPress={confirm}
        />
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
  row: { flexDirection: 'row', gap: Spacing.three },
  rowIcon: { marginTop: 1 },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, backgroundColor: Colors.background },
});
