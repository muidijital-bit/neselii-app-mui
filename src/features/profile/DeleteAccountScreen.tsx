import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { FormError } from '@/features/auth/AuthForm';
import { PageHeader } from '@/features/notifications/PageHeader';
import { colors, fontFamily, radii, spacing, textStyles } from '@/theme';

import { useDeleteAccount } from './useDeleteAccount';

const WILL_BE_DELETED = [
  'Hesabınız (ad soyad, e-posta, telefon)',
  'Favori ilanlarınız ve kayıtlı aramalarınız',
  'İlan sohbetleriniz ve mesajlarınız',
  'Bildirimleriniz ve bildirim tercihleriniz',
] as const;

const LIMITS = [
  'Hesabınız ve bağlı kayıtlarınız sunucudan kalıcı olarak silinir. İşlem geri alınamaz.',
  'Aynı e-postayla daha sonra yeniden kayıt olabilirsiniz; eski kayıtlarınız geri gelmez.',
  'İlk açılış (tanıtım) tercihiniz bu cihazda korunur: silindikten sonra giriş ekranına dönersiniz.',
] as const;

/**
 * Hesabımı Sil (12'den açılır; kaynakta tam tasarım yok — docs/PRODUCT.md "tamamlayıcı ekranlar"): profil ekranıyla aynı başlık, kart ve
 * buton bileşenleri. Silme sunucudaki `delete_my_account` işleviyle yapılır; hesaba bağlı kayıtlar yabancı anahtar zinciriyle silinir.
 * ONAYSIZ SİLİNMEZ: "Hesabımı Sil" yalnızca onay adımını açar; silme ikinci, ayrı
 * "Evet, hesabımı sil" dokunuşuyla başlar. Vazgeçmek hiçbir şeyi değiştirmez. Başarıda oturum kapanır ve giriş ekranına dönülür (bkz.
 * `useDeleteAccount`); hatada hesap yerinde kalır, açık hata ve "Tekrar dene" görünür.
 */
export function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteAccount, deleting, failure, clearFailure } = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);

  const cancelConfirm = () => {
    clearFailure();
    setConfirming(false);
  };

  return (
    <Screen background={colors.white} edges={['top', 'left', 'right', 'bottom']} testID="delete-account-screen">
      <PageHeader title="Hesabımı Sil" testID="delete-account-back" />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" testID="delete-account-scroll">
        <View style={styles.card} testID="delete-account-scope">
          <Text style={styles.cardTitle} accessibilityRole="header">
            Silinecekler
          </Text>
          {WILL_BE_DELETED.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Icon name="trash-2" size={16} color={colors.danger} />
              <Text style={[textStyles.bodySmall, styles.bulletText]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card} testID="delete-account-limits">
          <Text style={styles.cardTitle} accessibilityRole="header">
            Bilmeniz gerekenler
          </Text>
          {LIMITS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Icon name="info" size={16} color={colors.blue} />
              <Text style={[textStyles.bodySmall, styles.bulletText]}>{item}</Text>
            </View>
          ))}
        </View>

        {confirming ? (
          <View style={styles.confirm} accessibilityLiveRegion="polite" testID="delete-account-confirm">
            <Text style={styles.confirmTitle} accessibilityRole="header">
              Hesabınızı silmek istediğinize emin misiniz?
            </Text>
            <Text style={[textStyles.bodySmall, styles.bulletText]}>Hesabınız ve hesabınıza bağlı tüm kayıtlar kalıcı olarak silinir. Bu işlem geri alınamaz.</Text>
            <FormError message={failure ? `Hesap silinemedi. ${failure.message ?? ''}`.trim() : null} testID="delete-account-error" />
            <Btn
              label={failure ? 'Tekrar dene' : 'Evet, hesabımı sil'}
              variant="danger"
              icon="trash-2"
              onPress={() => void deleteAccount()}
              loading={deleting}
              testID="delete-account-confirm-button"
            />
            <Btn label="Vazgeç" variant="secondary" onPress={cancelConfirm} disabled={deleting} testID="delete-account-cancel" />
          </View>
        ) : (
          <View style={styles.actions}>
            <Btn label="Hesabımı Sil" variant="danger" icon="trash-2" onPress={() => setConfirming(true)} testID="delete-account-start" />
            <Btn label="Vazgeç" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} testID="delete-account-dismiss" />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

// Tamamlayıcı ekran: profil (12) ile aynı değerler — içerik 16 iç boşluk / 14 aralık, kartlar beyaz r14 kenarlı; düğme 52 (Btn).
const styles = StyleSheet.create({
  // Ekran zemini beyaz (durum çubuğu ve başlık beyaz görünür); yalnızca içerik alanı gri.
  scrollArea: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, gap: 14 },
  card: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft },
  cardTitle: { ...textStyles.titleSection, color: colors.navy },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  bulletText: { flex: 1, color: colors.inkMuted },
  actions: { gap: spacing.lg },
  confirm: { gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.danger },
  confirmTitle: { fontFamily: fontFamily.montserrat700, fontSize: 16, lineHeight: 19.2, color: colors.danger },
});
