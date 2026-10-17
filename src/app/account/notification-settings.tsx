import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Card, Divider, SectionLabel, ToggleRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useProfile, useUpdateProfile } from '@/features/profile/api';
import {
  openAppSettings,
  requestLocationPermission,
  requestNotificationPermission,
  useNotificationPermission,
} from '@/lib/permissions';
import type { ProfileUpdate } from '@/types/database';

const types = [
  { key: 'notify_new_listings', title: 'Yeni ilanlar', subtitle: 'Kayıtlı aramalarınızla eşleşen ilanlar' },
  { key: 'notify_price_changes', title: 'Fiyat değişiklikleri', subtitle: 'Favori ilanlarınızdaki fiyat güncellemeleri' },
  { key: 'notify_status_changes', title: 'Durum değişiklikleri', subtitle: 'Rezerve ve satıldı bilgisi' },
  { key: 'notify_message_replies', title: 'Mesaj cevapları', subtitle: 'Neşeli Otomotiv mesajınıza cevap verdiğinde' },
  { key: 'notify_announcements', title: 'Duyurular', subtitle: 'Firmadan genel duyurular' },
] as const;

export default function NotificationSettingsScreen() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const [pushState, refreshPush] = useNotificationPermission();

  const save = (patch: ProfileUpdate) =>
    update.mutate(patch, { onError: (e) => Alert.alert('Kaydedilemedi', e.message) });

  const onPushToggle = async (on: boolean) => {
    if (!on || pushState === 'denied') {
      // İzin uygulama içinden geri alınamaz / tekrar sorulamaz: sistem ayarlarına yönlendir
      openAppSettings();
      return;
    }
    await requestNotificationPermission();
    refreshPush();
  };

  const onNearbyToggle = async (on: boolean) => {
    if (on && (await requestLocationPermission()) !== 'granted') {
      Alert.alert('Konum izni gerekli', 'Yakındaki ilanları önce göstermek için konum iznini ayarlardan açabilirsiniz.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayarları Aç', onPress: openAppSettings },
      ]);
      return;
    }
    save({ prefer_nearby: on });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bildirim Tercihleri" />
      {!profile.data ? (
        <StateView loading={profile.isLoading} title={profile.isError ? 'Tercihler yüklenemedi' : undefined} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <SectionLabel>Sistem</SectionLabel>
          <Card>
            <ToggleRow
              title="Anlık bildirimler"
              subtitle={pushState === 'granted' ? 'Açık' : 'Kapalı · açmak için dokunun'}
              value={pushState === 'granted'}
              onChange={onPushToggle}
            />
          </Card>

          <SectionLabel>Bildirim türleri</SectionLabel>
          <Card>
            {types.map((t, i) => (
              <View key={t.key}>
                {i > 0 ? <Divider /> : null}
                <ToggleRow
                  title={t.title}
                  subtitle={t.subtitle}
                  value={profile.data[t.key]}
                  onChange={(value) => save({ [t.key]: value })}
                />
              </View>
            ))}
          </Card>

          <SectionLabel>Konum</SectionLabel>
          <Card>
            <ToggleRow
              title="Yakındaki ilanları önce göster"
              subtitle="Konum izni · isteğe bağlı"
              value={profile.data.prefer_nearby}
              onChange={onNearbyToggle}
            />
          </Card>

          <Text variant="small" style={styles.footer}>
            İzinler ilk açılışta sorulur; buradan dilediğiniz zaman değiştirebilirsiniz.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { marginTop: Spacing.four, marginHorizontal: Spacing.one },
});
