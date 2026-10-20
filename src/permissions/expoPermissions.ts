import { Platform } from 'react-native';

import { isValidCoordinates } from '@/domain';

import type { PermissionState, PermissionStatus, PermissionsAdapter } from './types';

type SystemResponse = { readonly granted: boolean; readonly status: string; readonly canAskAgain: boolean };

function toState({ granted, status, canAskAgain }: SystemResponse): PermissionState {
  const mapped: PermissionStatus = granted ? 'granted' : status === 'undetermined' ? 'undetermined' : 'denied';
  return { status: mapped, canAskAgain };
}

// Native modüller ilk gerçek kullanımda yüklenir: uygulama açılışında ve izin ekranı dışında hiçbir izin modülü çalışmaz.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- bilinçli tembel yükleme (yukarıdaki açıklama)
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- bilinçli tembel yükleme
const location = () => require('expo-location') as typeof import('expo-location');

/** Android 13+ bildirim izin penceresi, en az bir bildirim kanalı varken açılır; kanal yalnızca yereldir (push kaydı değildir). */
async function ensureAndroidChannel(Notifications: ReturnType<typeof notifications>): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'Genel', importance: Notifications.AndroidImportance.DEFAULT });
}

/**
 * Gerçek sistem adaptörü (expo-notifications / expo-location). Push belirteci alınmaz, bildirim planlanmaz, konum izlenmez;
 * yalnızca izin durumu okunur ve kullanıcı eylemiyle istenir.
 */
export const expoPermissions: PermissionsAdapter = {
  getNotificationState: async () => toState(await notifications().getPermissionsAsync()),
  requestNotifications: async () => {
    const Notifications = notifications();
    await ensureAndroidChannel(Notifications);
    return toState(await Notifications.requestPermissionsAsync());
  },
  getLocationState: async () => toState(await location().getForegroundPermissionsAsync()),
  requestLocation: async () => toState(await location().requestForegroundPermissionsAsync()),
  getCurrentCoordinates: async () => {
    const Location = location();
    // İzin penceresi AÇILMAZ: yalnızca zaten verilmiş izinle tek seferlik okuma. Android'in "Konum Doğruluğu" ayar penceresi de
    // AÇILMAZ (`mayShowUserSettingsDialog: false`): cihaz konumu kapalıysa istek hata verir ve sıra en yeniye düşer. İzleme (watch) ve arka plan yok.
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    try {
      let accuracy = Location.Accuracy.Balanced;
      if (Platform.OS === 'android') {
        const providers = await Location.getProviderStatusAsync();
        if (!providers.locationServicesEnabled) return null;
        // Balanced ağ sağlayıcısı olmadan GPS fix'ini istemeyebilir. Yalnız GPS mevcutsa
        // tek istekte High kullan; sürekli/arka plan izleme veya ayar penceresi açma.
        if (providers.networkAvailable === false && providers.gpsAvailable === true) accuracy = Location.Accuracy.High;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy, mayShowUserSettingsDialog: false });
      const coordinates = { latitude: coords.latitude, longitude: coords.longitude };
      return isValidCoordinates(coordinates) ? coordinates : null;
    } catch {
      return null; // konum servisi kapalı / zaman aşımı: yakınlık sırası yerine en yeni sıra kullanılır
    }
  },
};
