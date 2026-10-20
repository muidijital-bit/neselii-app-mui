import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/components/Btn';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons/Icon';
import { userMessage, type NotificationPreferences } from '@/domain';
import { StateMessage } from '@/features/listings/ListStates';
import { PageHeader } from '@/features/notifications/PageHeader';
import { useSystemPermissions } from '@/permissions';
import { colors, fontFamily, radii, spacing } from '@/theme';

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
 * Bildirim Tercihleri (12b), Profil → Bildirim Tercihleri.
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
        <View style={styles.center} accessibilityState={{ busy: true }} accessibilityLabel="Tercihler yükleniyor" testID="preferences-loading">
          <ActivityIndicator color={colors.blue} />
        </View>
      </Frame>
    );
  }
  if (!preferences.data) {
    return (
      <Frame>
        <StateMessage
          icon="info"
          title="Tercihler yüklenemedi"
          message={preferences.error ? userMessage(preferences.error) : 'Lütfen daha sonra tekrar deneyin.'}
          actionLabel="Tekrar dene"
          onAction={() => void preferences.refetch()}
          testID="preferences-error"
        />
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="preferences-scroll">
        {failure ? (
          <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="preferences-failure">
            <Icon name="info" size={18} color={colors.blue} />
            <Text style={styles.noticeText}>{failure}</Text>
          </View>
        ) : null}

        <GroupTitle>SİSTEM</GroupTitle>
        <View style={styles.card}>
          <PreferenceRow label="Anlık bildirimler" sub={system.sub} on={system.on} onPress={toggleSystem} busy={acting} testID="preferences-system" />
        </View>
        {system.denied ? <SettingsNotice message="Bildirim izni kapalı. Bildirimleri açmak için cihaz ayarlarını kullanabilirsiniz." testID="preferences-system-settings" /> : null}

        <GroupTitle>BİLDİRİM TÜRLERİ</GroupTitle>
        <View style={styles.card}>
          {TYPE_ROWS.map((row) => (
            <PreferenceRow key={row.key} label={row.label} sub={row.sub} on={current[row.key]} onPress={() => toggleType(row.key)} busy={acting} testID={`preferences-${row.key}`} />
          ))}
        </View>

        <GroupTitle>KONUM</GroupTitle>
        <View style={styles.card}>
          <PreferenceRow label="Yakındaki ilanları önce göster" sub={location.sub} on={location.on} onPress={toggleLocation} busy={acting} testID="preferences-nearby" />
        </View>
        {location.denied ? <SettingsNotice message="Konum izni kapalı. Yakındaki ilanlar için cihaz ayarlarından konum iznini açabilirsiniz." testID="preferences-location-settings" /> : null}

        <Text style={styles.footnote}>İzinler ilk açılışta sorulur; buradan dilediğiniz zaman değiştirebilirsiniz.</Text>
      </ScrollView>
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <Screen testID="preferences-screen">
      <View style={styles.header}>
        <PageHeader title="Bildirim Tercihleri" testID="preferences-back" />
      </View>
      {children}
    </Screen>
  );
}

function GroupTitle({ children }: { children: string }) {
  return (
    <Text style={styles.groupTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** İzin reddedildiğinde: açıklama + sistem ayarlarına bağlantı (yeniden sorulamayan izin yalnızca oradan açılır). */
function SettingsNotice({ message, testID }: { message: string; testID: string }) {
  return (
    <View style={styles.notice} testID={testID}>
      <View style={styles.noticeRow}>
        <Icon name="info" size={18} color={colors.blue} />
        <Text style={styles.noticeText}>{message}</Text>
      </View>
      <Btn label="Ayarları Aç" variant="secondary" onPress={() => void openSystemSettings()} testID={`${testID}-open`} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white },
  content: { padding: spacing.xl, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontFamily: fontFamily.inter600, fontSize: 11, lineHeight: 11, letterSpacing: 11 * 0.08, color: colors.slate, marginTop: 8, marginHorizontal: 4 },
  card: { backgroundColor: colors.white, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineSoft, overflow: 'hidden' },
  footnote: { marginTop: 6, marginHorizontal: 4, fontFamily: fontFamily.inter400, fontSize: 12, lineHeight: 12 * 1.45, color: colors.slateLight },
  notice: { gap: 10, padding: 12, borderRadius: radii.xl, backgroundColor: colors.blueTint },
  noticeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontFamily: fontFamily.inter400, fontSize: 13, lineHeight: 19, color: colors.blue },
});
