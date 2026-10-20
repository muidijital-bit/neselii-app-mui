import KeyValueStore from 'expo-sqlite/kv-store';

/** Cihaz tercihleri (onboarding, izin istendi bilgisi) için en küçük anahtar-değer arayüzü. */
export type DeviceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * expo-sqlite tabanlı kalıcı depo (AsyncStorage'ın Expo karşılığı). Yalnızca verilen anahtarı okur/yazar/siler; toplu silme yoktur
 * (oturum Supabase istemcisinin kendi deposundadır, onboarding ve cihaz tercihleri burada ayrı anahtarlardadır).
 */
export function createDeviceStorage(): DeviceStorage {
  return {
    getItem: (key) => KeyValueStore.getItem(key),
    setItem: (key, value) => KeyValueStore.setItem(key, value),
    removeItem: async (key) => {
      await KeyValueStore.removeItem(key);
    },
  };
}
