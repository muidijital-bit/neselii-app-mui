import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { IconTile } from '@/ui/Ui';
import { Colors, Spacing } from '@/ui/theme';

import { leadRequestHref } from './routes';

/**
 * İlan detayındaki "Sizi arayalım" bölümü: detayın diğer beyaz bölümleriyle aynı görünüm. Dokununca talep formu açılır (konu: bilgi, finansman,
 * görüntülü inceleme). Yöneticide ve satılmış ilanda çağıran tarafından gösterilmez.
 */
export function LeadCallbackCard({ listingId }: { listingId: string }) {
  const router = useRouter();
  return (
    <View style={styles.section} testID="listing-callback-card">
      <View style={styles.row}>
        <IconTile icon="phone-call" bg={Colors.successSoft} color="success" size={48} />
        <View style={styles.text}>
          <Text variant="subheading" accessibilityRole="header">
            Sizi arayalım
          </Text>
          <Text variant="small">Bilgi, finansman veya görüntülü inceleme için danışmanımız size uygun saatte dönsün.</Text>
        </View>
      </View>
      <Button title="Beni Arayın" icon="phone-incoming" variant="outline" onPress={() => router.push(leadRequestHref(listingId))} testID="listing-callback" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: Colors.surface, padding: Spacing.three, gap: Spacing.three, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: 2 },
});
