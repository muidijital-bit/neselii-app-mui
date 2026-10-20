import { STORAGE_KEYS } from '@/services';

/** AsyncStorage ile uyumlu en küçük arayüz; onboarding anahtarı mock durumundan AYRIDIR ve mock sıfırlamasından etkilenmez. */
export type OnboardingStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const COMPLETED = '1';

/** Yalnızca açıkça `'1'` ise tamamlanmış sayılır; yok/bozuk değer onboarding'i yeniden gösterir (güvenli taraf). */
export async function readOnboardingCompleted(storage: OnboardingStorage): Promise<boolean> {
  return (await storage.getItem(STORAGE_KEYS.onboarding)) === COMPLETED;
}

export async function writeOnboardingCompleted(storage: OnboardingStorage): Promise<void> {
  await storage.setItem(STORAGE_KEYS.onboarding, COMPLETED);
}
