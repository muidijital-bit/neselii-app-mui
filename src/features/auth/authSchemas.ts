import { z } from 'zod';

import { isValidEmail, isValidName, isValidOptionalPhone, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/domain';

/**
 * Form şemaları. Kurallar `@/domain/authRules` ile ortaktır (servis aynı kuralları uygular). Hata iletileri sabittir:
 * girilen değer (özellikle parola) iletiye ya da hata nesnesine KOPYALANMAZ.
 */
const email = z.string().refine((value) => value.trim() !== '', 'E-posta girin.').refine(isValidEmail, 'Geçerli bir e-posta girin.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Şifrenizi girin.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().refine(isValidName, 'Ad soyadınızı girin.'),
    email,
    phone: z.string().refine(isValidOptionalPhone, 'Geçerli bir telefon numarası girin.'),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`)
      .max(MAX_PASSWORD_LENGTH, `Şifre en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`),
    passwordConfirm: z.string().min(1, 'Şifrenizi tekrar girin.'),
    consent: z.boolean().refine((value) => value, 'Devam etmek için onaylamanız gerekir.'),
  })
  .refine((values) => values.password === values.passwordConfirm, { path: ['passwordConfirm'], message: 'Şifreler eşleşmiyor.' });
export type RegisterValues = z.infer<typeof registerSchema>;

export const REGISTER_DEFAULTS: RegisterValues = { fullName: '', email: '', phone: '', password: '', passwordConfirm: '', consent: false };

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Yeni parola 006 kayıt kurallarıyla aynıdır (uzunluk + tekrar eşleşmesi). */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`)
      .max(MAX_PASSWORD_LENGTH, `Şifre en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir.`),
    passwordConfirm: z.string().min(1, 'Şifrenizi tekrar girin.'),
  })
  .refine((values) => values.password === values.passwordConfirm, { path: ['passwordConfirm'], message: 'Şifreler eşleşmiyor.' });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
