import { Linking } from 'react-native';

/** Main tasarımındaki firma telefonu (0 (312) 335 06 66); `.env.local` → `EXPO_PUBLIC_COMPANY_PHONE` doluysa o kullanılır. */
const DEFAULT_COMPANY_PHONE = '+903123350666';

/** Firma telefonu: env değeri (ör. `+903120000000`) ya da main'deki varsayılan numara. */
export const COMPANY_PHONE = process.env.EXPO_PUBLIC_COMPANY_PHONE?.replace(/[^+\d]/g, '') || DEFAULT_COMPANY_PHONE;

export const COMPANY_PHONE_MISSING = 'Firma telefon numarası henüz eklenmedi; şimdilik arama başlatılamıyor.';

/** Telefon uygulamasını açar. Numara yoksa ya da arama açılamazsa `onUnavailable` kullanıcıya gösterilecek metinle çağrılır. */
export function callCompany(onUnavailable: (message: string) => void): void {
  if (!COMPANY_PHONE) {
    onUnavailable(COMPANY_PHONE_MISSING);
    return;
  }
  Linking.openURL(`tel:${COMPANY_PHONE}`).catch(() => onUnavailable('Arama başlatılamadı.'));
}
