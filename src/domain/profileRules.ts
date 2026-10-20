import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, isValidOptionalPhone } from './authRules';

/**
 * Profil düzenleme kuralları (saf). Form (Zod) ve mock servis aynı kuralları ve aynı sabit iletileri kullanır; form geçip servis
 * reddetmez ya da tersi olmaz. Ad soyad ve telefon kuralı kayıtla (`authRules`) ortaktır. E-posta düzenlenemez: kuralı yoktur.
 */
export const PROFILE_NAME_REQUIRED = 'Ad soyadınızı girin.';
export const PROFILE_NAME_LENGTH = `Ad soyad en az ${MIN_NAME_LENGTH}, en fazla ${MAX_NAME_LENGTH} karakter olmalı.`;
export const PROFILE_PHONE_INVALID = 'Geçerli bir telefon numarası girin.';

/** Geçerliyse `null`, değilse kullanıcıya gösterilecek sabit ileti (girilen değer iletiye kopyalanmaz). */
export function profileNameError(value: string): string | null {
  const length = value.trim().length;
  if (length === 0) return PROFILE_NAME_REQUIRED;
  return length < MIN_NAME_LENGTH || length > MAX_NAME_LENGTH ? PROFILE_NAME_LENGTH : null;
}

/** Telefon isteğe bağlıdır: boş (ya da yalnız boşluk) geçerlidir. */
export const profilePhoneError = (value: string): string | null => (isValidOptionalPhone(value) ? null : PROFILE_PHONE_INVALID);

export const normalizeProfileName = (value: string): string => value.trim();

/** Boş telefon `null` (alan kaldırılır); doluysa kırpılmış metin. */
export function normalizeProfilePhone(value: string | null | undefined): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}

/** Türkçe büyük harf: `i → İ`, `ı → I` (Hermes'te `Intl`/locale'e güvenilmez). */
const upperTr = (char: string) => (char === 'i' ? 'İ' : char === 'ı' ? 'I' : char.toUpperCase());

const LETTER = /^[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/;

/** Avatar baş harfleri: ilk ve son sözcüğün ilk harfi (`Emre Kaya` → `EK`); tek sözcükte tek harf; harfle başlamayan sözcükler (`12`) atlanır; boşsa boş metin. */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter((word) => LETTER.test(word));
  if (words.length === 0) return '';
  const first = Array.from(words[0])[0];
  if (words.length === 1) return upperTr(first);
  return upperTr(first) + upperTr(Array.from(words[words.length - 1])[0]);
}
