import type { Coordinates } from '@/domain';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PermissionState = {
  readonly status: PermissionStatus;
  /** `false`: sistem artık izin penceresi göstermez; yalnızca sistem ayarlarından değişir. */
  readonly canAskAgain: boolean;
};

/**
 * Sistem izinleri için TEK sınır. Durum her zaman sistemden okunur; uygulama izin durumunu kendi başına saklamaz
 * ("verildi" diye saklanmış bir bool sistem iznin yerine geçmez). `request*` yalnızca kullanıcı bir düğmeye bastığında çağrılır.
 */
export interface PermissionsAdapter {
  getNotificationState(): Promise<PermissionState>;
  requestNotifications(): Promise<PermissionState>;
  /** Yalnızca ön plan (when-in-use) konum. */
  getLocationState(): Promise<PermissionState>;
  requestLocation(): Promise<PermissionState>;
  /**
   * Cihazın o anki konumunu TEK SEFER okur (yakınlık sırası için, ön plan). İzin verilmemişse ya da konum alınamazsa `null`; izin PENCERESİ açmaz.
   * Dönen koordinat çağıranın belleğinde kalır: ne saklanır ne de servise/ağa gönderilir. Sürekli izleme ve arka plan konumu yoktur.
   */
  getCurrentCoordinates(): Promise<Coordinates | null>;
}
