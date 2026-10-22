import { ScrollView, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/features/notifications/PageHeader';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Card } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

type Section = { readonly key: string; readonly icon: IconName; readonly title: string; readonly body: string };

// TODO: Metinler yayın öncesi firmanın hukuk danışmanıyla gözden geçirilmeli. (Metinler main tasarımıyla birebir aynıdır.)
const SECTIONS: readonly Section[] = [
  {
    key: 'account',
    icon: 'user',
    title: 'Hangi verileri tutuyoruz?',
    body:
      'Ad soyad, e-posta ve isteğe bağlı telefon numaranız; favorileriniz, kayıtlı aramalarınız, ' +
      'Neşeli Otomotiv ile yaptığınız ilan görüşmeleri ve bildirim tercihleriniz hesabınıza bağlı olarak saklanır.',
  },
  {
    key: 'security',
    icon: 'lock',
    title: 'Verileriniz güvende',
    body:
      'Verileriniz şifreli bağlantı üzerinden iletilir. Her kullanıcı yalnızca kendi favorilerini, ' +
      'aramalarını ve mesajlarını görebilir. Verileriniz üçüncü kişilerle paylaşılmaz veya satılmaz.',
  },
  {
    key: 'location',
    icon: 'map-pin',
    title: 'Konum ve bildirim izinleri isteğe bağlıdır',
    body:
      'Konum izni verirseniz yakınlık sıralaması cihazınızda hesaplanır; konumunuz sunucuya kaydedilmez ' +
      've arka planda konum toplanmaz. İzinleri Bildirim Tercihleri ekranından yönetebilirsiniz.',
  },
  {
    key: 'delete',
    icon: 'trash-2',
    title: 'Hesabınızı silebilirsiniz',
    body: 'Profil > Hesabımı Sil adımıyla hesabınızı ve size ait tüm verileri dilediğiniz zaman kalıcı olarak silebilirsiniz.',
  },
];

/** Gizlilik ve Güvenlik (main tasarımı): bilgi kartları + yayın öncesi eklenecek hukuki metinler uyarısı. */
export function PrivacyScreen() {
  return (
    <View style={styles.container} testID="privacy-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Gizlilik ve Güvenlik" testID="privacy-back" />
      <ScrollView contentContainerStyle={styles.content} testID="privacy-scroll">
        {SECTIONS.map((s) => (
          <View key={s.key} testID={`privacy-section-${s.key}`}>
            <Card style={styles.card}>
              <View style={styles.titleRow}>
                <Icon name={s.icon} size={26} />
                <Text variant="subheading" style={styles.flex} accessibilityRole="header">
                  {s.title}
                </Text>
              </View>
              <Text variant="body" color="textSecondary">
                {s.body}
              </Text>
            </Card>
          </View>
        ))}

        <View style={styles.pending} testID="privacy-missing-texts">
          <View style={styles.titleRow}>
            <Icon name="info" size={26} color="warning" />
            <Text variant="subheading" style={styles.flex} accessibilityRole="header">
              Yayın öncesi eklenecek metinler
            </Text>
          </View>
          <Text variant="body" color="textSecondary">
            KVKK Aydınlatma Metni, Açık Rıza Metni ve Kullanım Koşulları firma tarafından sağlandığında bu bölümde yer alacaktır.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  card: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pending: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#E3B95A',
    backgroundColor: Colors.warningSoft,
  },
});
