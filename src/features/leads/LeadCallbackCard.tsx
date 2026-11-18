import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { tradeInHref } from '@/features/trade/routes';

import { DOCUMENTS_HREF, leadRequestHref, reservationRequestHref } from './routes';

/**
 * İlan detayındaki "Sizi arayalım" bölümü: detayın diğer beyaz bölümleriyle aynı görünüm. Dokununca talep formu açılır (konu: bilgi, finansman,
 * görüntülü inceleme). Yöneticide ve satılmış ilanda çağıran tarafından gösterilmez.
 */
export function LeadCallbackCard({ listingId, canReserve }: { listingId: string; /** Madde 33: yayındaki ilanda "Rezerve Et" talebi. */ canReserve: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.section} testID="listing-callback-card">
      <View style={styles.row}>
        <IconTile icon="phone-call" bg={Colors.successSoft} color="success" size={48} />
        <View style={styles.text}>
          <Text variant="subheading" accessibilityRole="header">
            Sizi arayalım
          </Text>
          <Text variant="small">Bilgi, finansman, inceleme ve ekspertiz randevusu ya da sigorta teklifi için danışmanımız size uygun saatte dönsün.</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button title="Beni Arayın" icon="phone-incoming" variant="outline" style={styles.flex} onPress={() => router.push(leadRequestHref(listingId))} testID="listing-callback" />
        {canReserve ? (
          <Button title="Rezerve Et" icon="lock" variant="outline" style={styles.flex} onPress={() => router.push(reservationRequestHref(listingId))} testID="listing-reserve" />
        ) : null}
      </View>
      {/* Madde 35: bu araç için takas başvurusu. */}
      <Pressable accessibilityRole="link" onPress={() => router.push(tradeInHref({ listingId, kind: 'trade_in' }))} style={styles.docs} testID="listing-trade-in">
        <Icon name="repeat" size={18} color="heading" />
        <Text variant="smallSemibold" color="heading" style={styles.flex}>
          Aracımı takasa vermek istiyorum
        </Text>
        <Icon name="chevron-right" size={18} color="textTertiary" />
      </Pressable>
      {/* Madde 16: satın alma için gerekli belgeler. */}
      <Pressable accessibilityRole="link" onPress={() => router.push(DOCUMENTS_HREF)} style={styles.docs} testID="listing-documents">
        <Icon name="file-text" size={18} color="heading" />
        <Text variant="smallSemibold" color="heading" style={styles.flex}>
          Satın alma için gerekli belgeler
        </Text>
        <Icon name="chevron-right" size={18} color="textTertiary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.three, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: 2 },
  flex: { flex: 1 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  docs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
