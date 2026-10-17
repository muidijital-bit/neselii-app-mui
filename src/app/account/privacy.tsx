import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Card } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';

// TODO: Metinler yayın öncesi firmanın hukuk danışmanıyla gözden geçirilmeli.
const sections: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'user',
    title: 'Hangi verileri tutuyoruz?',
    body:
      'Ad soyad, e-posta ve isteğe bağlı telefon numaranız; favorileriniz, kayıtlı aramalarınız, ' +
      'Neşeli Otomotiv ile yaptığınız ilan görüşmeleri ve bildirim tercihleriniz hesabınıza bağlı olarak saklanır.',
  },
  {
    icon: 'lock',
    title: 'Verileriniz güvende',
    body:
      'Verileriniz şifreli bağlantı üzerinden iletilir. Her kullanıcı yalnızca kendi favorilerini, ' +
      'aramalarını ve mesajlarını görebilir. Verileriniz üçüncü kişilerle paylaşılmaz veya satılmaz.',
  },
  {
    icon: 'map-pin',
    title: 'Konum ve bildirim izinleri isteğe bağlıdır',
    body:
      'Konum izni verirseniz yakınlık sıralaması cihazınızda hesaplanır; konumunuz sunucuya kaydedilmez ' +
      've arka planda konum toplanmaz. İzinleri Bildirim Tercihleri ekranından yönetebilirsiniz.',
  },
  {
    icon: 'trash-2',
    title: 'Hesabınızı silebilirsiniz',
    body:
      'Profil > Hesabımı Sil adımıyla hesabınızı ve size ait tüm verileri dilediğiniz zaman kalıcı olarak silebilirsiniz.',
  },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Gizlilik ve Güvenlik" />
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s) => (
          <Card key={s.title} style={styles.card}>
            <View style={styles.titleRow}>
              <Icon name={s.icon} size={26} />
              <Text variant="subheading" style={styles.flex}>
                {s.title}
              </Text>
            </View>
            <Text variant="body" color="textSecondary">
              {s.body}
            </Text>
          </Card>
        ))}

        <View style={styles.pending}>
          <View style={styles.titleRow}>
            <Icon name="info" size={26} color="warning" />
            <Text variant="subheading" style={styles.flex}>
              Yayın öncesi eklenecek metinler
            </Text>
          </View>
          <Text variant="body" color="textSecondary">
            KVKK Aydınlatma Metni, Açık Rıza Metni ve Kullanım Koşulları firma tarafından sağlandığında bu
            bölümde yer alacaktır.
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
