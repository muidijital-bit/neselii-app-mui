import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { StateView } from '@/ui/StateView';
import { Colors } from '@/ui/theme';

import { PageHeader } from './PageHeader';

/** Geçersiz/bozuk bir bildirim hedefinin güvenli durumu (çökme yok): açıklama + bildirimlere dönüş. Main'de karşılığı yok; main'in boş durum dili. */
export function NotificationUnavailableScreen() {
  const router = useRouter();
  return (
    <View style={styles.container} testID="notification-unavailable-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Bildirim" testID="notification-unavailable-back" />
      <View style={styles.state} testID="notification-unavailable">
        <StateView
          icon="alert-circle"
          title="Bildirim içeriğine ulaşılamıyor"
          message="Bu bildirimin bağlantısı geçersiz ya da içerik artık mevcut değil. Bildirimlerinize dönebilirsiniz."
          actions={[{ title: 'Bildirimlere dön', icon: 'arrow-left', onPress: () => router.navigate('/notifications') }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  state: { flex: 1 },
});
