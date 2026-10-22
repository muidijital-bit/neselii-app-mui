import { Fragment, useRef, useState, type ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { userMessage, type NotificationPreferences } from '@/domain';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSystemPermissions } from '@/permissions';
import { Button } from '@/ui/Button';
import { FocusStatusBar } from '@/ui/FocusStatusBar';
import { Icon } from '@/ui/Icon';
import { StateView } from '@/ui/StateView';
import { Text } from '@/ui/Text';
import { Card, Divider, SectionLabel } from '@/ui/Ui';
import { Colors, Radius, Spacing } from '@/ui/theme';

import { PreferenceRow } from './PreferenceRow';
import { TYPE_ROWS, locationRowView, systemRowView } from './preferenceModel';
import { usePreferencesQuery, usePreferencesUpdate } from './usePreferences';

/** Sistem ayarlarını açar (uygulamanın izin sayfası). Açılamazsa sessiz kalır; kullanıcı yine cihaz ayarlarından değiştirebilir. */
async function openSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    /* ayarlar açılamadı: ekrandaki açıklama geçerli kalır */
  }
}

/**
 * Bildirim Tercihleri (main tasarımı), Profil → Bildirim Tercihleri.
 *  - SİSTEM / "Anlık bildirimler": görünüm YALNIZCA cihazdan okunan bildirim iznine bağlıdır; reddedilmiş/sorulmamış izin anahtarı açık göstermez.
 *    İzin yoksa dokunuş sistem izin penceresini açar (yeniden sorulamıyorsa sistem ayarlarına gider); verilmişse dokunuş ayarları açar.
 *  - BİLDİRİM TÜRLERİ: uygulama içi tercihler (servis). Sistem izninden bağımsız saklanır.
 *  - KONUM / "Yakındaki ilanları önce göster": açık görünmesi için tercih AÇIK ve konum izni VERİLMİŞ olmalıdır. Açarken izin yoksa önce izin istenir;
 *    verilmezse tercih AÇILMAZ. Servise yalnızca bu mantıksal tercih gider — konum/koordinat saklanmaz ve gönderilmez.
 *  - Ayarlardan dönüşte (uygulama ön plana gelince) izinler yeniden okunur.
 */
export function NotificationPreferencesScreen() {
  const preferences = usePreferencesQuery();
  const permissions = useSystemPermissions();
  const { update, beginAction, pendingPatch, failure, clearFailure } = usePreferencesUpdate();
  const [acting, setActing] = useState(false);
  const inFlight = useRef(false);

  /** Tek seferde tek eylem (izin penceresi + servis çağrısı dahil): çift dokunuş yok sayılır. */
  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setActing(true);
    clearFailure();
    try {
      await action();
    } finally {
      inFlight.current = false;
      setActing(false);
    }
  };

  if (preferences.isPending && preferences.fetchStatus !== 'idle') {
    return (
      <Frame>
        <View style={styles.state} accessible accessibilityState={{ busy: true }} accessibilityLabel="Tercihler yükleniyor" testID="preferences-loading">
          <StateView loading />
        </View>
      </Frame>
    );
  }
  if (!preferences.data) {
    return (
      <Frame>
        <View style={styles.state} testID="preferences-error">
          <StateView
            title="Tercihler yüklenemedi"
            message={preferences.error ? userMessage(preferences.error) : 'Lütfen daha sonra tekrar deneyin.'}
            actions={[{ title: 'Tekrar dene', icon: 'refresh-cw', onPress: () => void preferences.refetch() }]}
          />
        </View>
      </Frame>
    );
  }

  // Güncelleme sürerken anahtar hedef değerde görünür (dokunuşa anında yanıt); hata/sonuçla servis değerine döner.
  const current: NotificationPreferences = { ...preferences.data, ...pendingPatch };
  const system = systemRowView(permissions.notifications);
  const location = locationRowView(current.nearbyFirst, permissions.location);

  const toggleType = (key: (typeof TYPE_ROWS)[number]['key']) =>
    void run(async () => {
      await update({ [key]: !current[key] }, beginAction());
    });

  const toggleSystem = () =>
    void run(async () => {
      const state = permissions.notifications;
      if (state === null) return void (await permissions.refresh()); // okunamadıysa önce durumu yeniden oku
      if (state.status === 'granted' || (state.status === 'denied' && !state.canAskAgain)) return openSystemSettings();
      await permissions.request('notifications'); // sonuç sistemin gerçek yanıtıdır; reddedilirse anahtar kapalı kalır
    });

  const toggleLocation = () =>
    void run(async () => {
      // Oturum kanıtı eylem ANINDA, izin penceresi açılmadan önce alınır: pencere açıkken çıkış/hesap değişimi olursa tercih yazılmaz.
      const isCurrent = beginAction();
      if (location.on) {
        await update({ nearbyFirst: false }, isCurrent);
        return;
      }
      let state = permissions.location;
      if (state === null) {
        await permissions.refresh();
        return;
      }
      if (state.status !== 'granted') {
        if (state.status === 'denied' && !state.canAskAgain) return openSystemSettings();
        state = await permissions.request('location');
      }
      if (state?.status === 'granted' && isCurrent()) await update({ nearbyFirst: true }, isCurrent);
    });

  return (
    <Frame>
      <ScrollView contentContainerStyle={styles.content} testID="preferences-scroll">
        {failure ? (
          <View style={[styles.notice, styles.noticeRow, styles.failure]} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="preferences-failure">
            <Icon name="alert-circle" size={20} color="danger" />
            <Text variant="small" color="danger" style={styles.flex}>
              {failure}
            </Text>
          </View>
        ) : null}

        <SectionLabel>Sistem</SectionLabel>
        <Card>
          <PreferenceRow label="Anlık bildirimler" sub={system.sub} on={system.on} onPress={toggleSystem} busy={acting} testID="preferences-system" />
        </Card>
        {system.denied ? <SettingsNotice message="Bildirim izni kapalı. Bildirimleri açmak için cihaz ayarlarını kullanabilirsiniz." testID="preferences-system-settings" /> : null}

        <SectionLabel>Bildirim türleri</SectionLabel>
        <Card>
          {TYPE_ROWS.map((row, index) => (
            <Fragment key={row.key}>
              {index > 0 ? <Divider /> : null}
              <PreferenceRow label={row.label} sub={row.sub} on={current[row.key]} onPress={() => toggleType(row.key)} busy={acting} testID={`preferences-${row.key}`} />
            </Fragment>
          ))}
        </Card>

        <SectionLabel>Konum</SectionLabel>
        <Card>
          <PreferenceRow label="Yakındaki ilanları önce göster" sub={location.sub} on={location.on} onPress={toggleLocation} busy={acting} testID="preferences-nearby" />
        </Card>
        {location.denied ? <SettingsNotice message="Konum izni kapalı. Yakındaki ilanlar için cihaz ayarlarından konum iznini açabilirsiniz." testID="preferences-location-settings" /> : null}

        <Text variant="small" style={styles.footer}>
          İzinler ilk açılışta sorulur; buradan dilediğiniz zaman değiştirebilirsiniz.
        </Text>
      </ScrollView>
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.container} testID="preferences-screen">
      <FocusStatusBar style="dark" />
      <PageHeader title="Bildirim Tercihleri" testID="preferences-back" />
      {children}
    </View>
  );
}

/** İzin reddedildiğinde: açıklama + sistem ayarlarına bağlantı (yeniden sorulamayan izin yalnızca oradan açılır). */
function SettingsNotice({ message, testID }: { message: string; testID: string }) {
  return (
    <View style={[styles.notice, styles.settingsNotice]} testID={testID}>
      <View style={styles.noticeRow}>
        <Icon name="info" size={20} />
        <Text variant="small" color="text" style={styles.flex}>
          {message}
        </Text>
      </View>
      <Button title="Ayarları Aç" variant="outline" icon="settings" onPress={() => void openSystemSettings()} testID={`${testID}-open`} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  state: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { marginTop: Spacing.four, marginHorizontal: Spacing.one },
  notice: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Colors.surfaceHighlight },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two + 2 },
  failure: { backgroundColor: Colors.dangerSoft },
  settingsNotice: { gap: Spacing.three },
});
