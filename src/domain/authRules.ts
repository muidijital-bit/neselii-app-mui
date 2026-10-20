/**
 * Giriş/kayıt girdi kuralları (saf). UI formu (Zod) ve mock servis aynı kuralları kullanır; böylece form geçip servis
 * reddetmez ya da tersi olmaz. Telefon yalnızca isteğe bağlı iletişim alanıdır — giriş yöntemi değildir.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 80;

// Bilinçli olarak basit: boşluksuz, tek `@`, noktalı alan adı. Gerçek doğrulama e-postanın ulaşmasıdır (demo'da yok).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

/** Boş değer geçerlidir (isteğe bağlı alan); doluysa 10–15 rakam ve yalnızca rakam/boşluk/`+`/`()`/`-`. */
export function isValidOptionalPhone(value: string): boolean {
  const text = value.trim();
  if (text === '') return true;
  if (!PHONE_PATTERN.test(text)) return false;
  const digits = text.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
}

export const isValidPassword = (value: string) => value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH;

export const isValidName = (value: string) => {
  const length = value.trim().length;
  return length >= MIN_NAME_LENGTH && length <= MAX_NAME_LENGTH;
};

export type PasswordStrength = { readonly level: 0 | 1 | 2 | 3 | 4; readonly label: string };

/**
 * Tasarımdaki dört çubuklu "Şifre gücü" göstergesi için basit sezgi (güvenlik garantisi değildir): uzunluk ve karakter
 * çeşitliliği. Boş şifrede seviye 0; 8 karakterden kısa şifre 1.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password === '') return { level: 0, label: '' };
  if (password.length < MIN_PASSWORD_LENGTH) return { level: 1, label: 'Zayıf' };
  const classes = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /[0-9]/, /[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]/].filter((re) => re.test(password)).length;
  const score = classes + (password.length >= 12 ? 1 : 0);
  if (score <= 2) return { level: 2, label: 'Orta' };
  if (score === 3) return { level: 3, label: 'İyi' };
  return { level: 4, label: 'Güçlü' };
}
