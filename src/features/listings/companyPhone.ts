import { Linking } from 'react-native';

/** Firma telefonu (`.env.local` → `EXPO_PUBLIC_COMPANY_PHONE`, ör. `+903120000000`). Boşsa arama düğmeleri açıklama gösterir. */
export const COMPANY_PHONE = process.env.EXPO_PUBLIC_COMPANY_PHONE?.replace(/[^+\d]/g, '') ?? '';

export const COMPANY_PHONE_MISSING = 'Firma telefon numarası henüz eklenmedi; şimdilik arama başlatılamıyor.';

/** Telefon uygulamasını açar. Numara yoksa ya da arama açılamazsa `onUnavailable` kullanıcıya gösterilecek metinle çağrılır. */
export function callCompany(onUnavailable: (message: string) => void): void {
  if (!COMPANY_PHONE) {
    onUnavailable(COMPANY_PHONE_MISSING);
    return;
  }
  Linking.openURL(`tel:${COMPANY_PHONE}`).catch(() => onUnavailable('Arama başlatılamadı.'));
}
