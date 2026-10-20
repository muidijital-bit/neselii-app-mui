import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PageHeader } from '@/features/notifications/PageHeader';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { PROFILE_TARGETS } from './routes';

type Section = { readonly key: string; readonly icon: IconName; readonly title: string; readonly body: string };

/**
 * Gizlilik ve Güvenlik. Metinler yalnızca bu uygulamanın GERÇEKTEN yaptığını söyler: hesap verisi Supabase sunucusunda, satır düzeyi
 * yetkiyle (RLS) yalnızca sahibine açık tutulur; konum cihazda hesaplanır ve gönderilmez; sistem push bildirimi henüz yoktur.
 */
const SECTIONS: readonly Section[] = [
  {
    key: 'account',
    icon: 'info',
    title: 'Hesabınız ve kayıtlarınız',
    body: 'Ad soyad, e-posta, isteğe bağlı telefon, favorileriniz, kayıtlı aramalarınız, ilan sohbetleriniz ve bildirim tercihleriniz hesabınıza bağlı olarak sunucuda saklanır. Bu kayıtları yalnızca siz görürsünüz; ilan sohbetlerinizi Neşeli Otomotiv yetkilileri de görür.',
  },
  {
    key: 'security',
    icon: 'shield-check',
    title: 'Şifreniz',
    body: 'Şifreniz uygulamada saklanmaz; sunucuda yalnızca şifrelenmiş (hash) biçimde tutulur. Şifrenizi unutursanız e-postanıza gönderilen bağlantıyla yenisini belirlersiniz.',
  },
  {
    key: 'location',
    icon: 'map-pin',
    title: 'Konum ve bildirim izinleri isteğe bağlıdır',
    body: 'Konum izni verirseniz yakınlık sıralaması cihazınızda hesaplanır; konumunuz sunucuya gönderilmez ve kaydedilmez. Arka planda konum toplanmaz. Bildirimler şimdilik uygulama içinde gösterilir. İzinleri Bildirim Tercihleri ekranından yönetirsiniz.',
  },
] as const;

/**
 * Yayın öncesi gereksinim: gizlilik politikası ve KVKK aydınlatma metni henüz YOKTUR. Bu ekran hukuki metin uydurmaz ve uyumluluk iddia etmez;
 * eksik metinlerin yayından önce firma tarafından sağlanması gerektiğini açıkça söyler.
 */
const MISSING_TEXTS = ['Gizlilik politikası', 'KVKK aydınlatma metni', 'Kullanım koşulları'] as const;

export function PrivacyScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} testID="privacy-screen">
      <PageHeader title="Gizlilik ve Güvenlik" testID="privacy-back" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="privacy-scroll">
        {SECTIONS.map(({ key, icon, title, body }) => (
          <View key={key} style={styles.card} testID={`privacy-section-${key}`}>
            <View style={styles.cardHead}>
              <Icon name={icon} size={20} color={colors.blue} />
              <Text style={styles.cardTitle} accessibilityRole="header">
                {title}
              </Text>
            </View>
            <Text style={[textStyles.bodySmall, styles.body]}>{body}</Text>
          </View>
        ))}

        <View style={styles.pending} testID="privacy-missing-texts">
          <View style={styles.cardHead}>
            <Icon name="info" size={20} color={colors.warningText} />
            <Text style={styles.cardTitle} accessibilityRole="header">
              Yayın öncesi sağlanacak metinler
            </Text>
          </View>
          <Text style={[textStyles.bodySmall, styles.body]}>
            Aşağıdaki metinler henüz hazır değildir; bu ekranda hukuki bir metin yer almaz. Uygulama yayımlanmadan önce Neşeli Otomotiv tarafından sağlanması gerekir. Bu sürüm
            KVKK ya da başka bir mevzuata uygunluk taahhüdü içermez.
          </Text>
          {MISSING_TEXTS.map((text) => (
            <View key={text} style={styles.listRow}>
              <Icon name="x" size={16} color={colors.warningText} />
              <Text style={[textStyles.bodySmall, styles.body, styles.listText]}>{`${text}: yayın öncesi sağlanacak`}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rowCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PROFILE_TARGETS.deleteAccount.title}
            accessibilityHint="Hesabınızı ve bağlı kayıtlarınızı silme ekranını açar"
            onPress={() => router.push(PROFILE_TARGETS.deleteAccount.href)}
            style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
            testID="privacy-delete-account">
            <Icon name="trash-2" size={20} color={colors.danger} />
            <View style={styles.deleteText}>
              <Text style={styles.deleteTitle}>{PROFILE_TARGETS.deleteAccount.title}</Text>
              <Text style={styles.deleteNote}>Hesabınız ve hesabınıza bağlı tüm kayıtlar kalıcı olarak silinir.</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.slateFaint} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Tamamlayıcı ekran: profil (12) ile aynı değerler — içerik 16 iç boşluk / 14 aralık, kartlar beyaz r14 kenarlı; uyarı kartı `warningTint` zeminli.
const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: 14 },
  card: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft },
  pending: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.warningTint, borderRadius: radii.card, borderWidth: 1, borderColor: colors.warningText },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cardTitle: { ...textStyles.titleSection, flex: 1, color: colors.navy },
  body: { color: colors.inkMuted },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  listText: { flex: 1 },
  rowCard: { backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft, overflow: 'hidden' },
  deleteRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: spacing.lg, paddingLeft: spacing.xl, paddingRight: 14, backgroundColor: colors.white },
  pressed: { backgroundColor: colors.surface },
  deleteText: { flex: 1, gap: 3 },
  deleteTitle: { fontFamily: fontFamily.inter600, fontSize: 15, lineHeight: 19.5, color: colors.danger },
  deleteNote: { fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 16.2, color: colors.slateLight },
});
